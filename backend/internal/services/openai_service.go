package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"voice-ai-backend/internal/config"
	"voice-ai-backend/internal/database"

	log "github.com/sirupsen/logrus"
)

type OpenAIService struct{}

func NewOpenAIService() *OpenAIService {
	return &OpenAIService{}
}

type OpenAISessionConfig struct {
	Session struct {
		Type         string `json:"type"`
		Model        string `json:"model"`
		Audio        struct {
			Output struct {
				Voice string `json:"voice"`
			} `json:"output"`
		} `json:"audio"`
		Instructions string `json:"instructions"`
	} `json:"session"`
}

type OpenAITokenResponse struct {
	ClientSecret struct {
		Value     string `json:"value"`
		ExpiresAt int64  `json:"expires_at"`
	} `json:"client_secret"`
}

// GetEphemeralToken получает ephemeral token для OpenAI Realtime API
func (s *OpenAIService) GetEphemeralToken(ctx context.Context, userID *int) (map[string]interface{}, error) {
	selectedVoice := "ash"
	selectedModel := "gpt-realtime"
	conversationHistory := ""

	// Если указан user_id, получаем его настройки
	if userID != nil {
		conn := database.Database.Pool

		// Получаем выбранный голос и модель
		var voice, model *string
		err := conn.QueryRow(ctx, `
			SELECT selected_voice, selected_model FROM users WHERE id = $1
		`, *userID).Scan(&voice, &model)

		if err == nil {
			if voice != nil {
				selectedVoice = *voice
			}
			if model != nil {
				selectedModel = *model
			}
		}

		// Получаем историю разговора
		rows, err := conn.Query(ctx, `
			SELECT role, content, msg_timestamp
			FROM get_user_conversation_context($1, 6)
			ORDER BY msg_timestamp ASC
		`, *userID)

		if err == nil {
			defer rows.Close()

			var messages []string
			for rows.Next() {
				var role, content string
				var timestamp interface{}
				if err := rows.Scan(&role, &content, &timestamp); err == nil {
					roleText := "Пользователь"
					if role == "assistant" {
						roleText = "Ты"
					}
					messages = append(messages, fmt.Sprintf("%s: %s", roleText, content))
				}
			}

			if len(messages) > 0 {
				conversationHistory = "\n\nКОНТЕКСТ ПРЕДЫДУЩЕГО РАЗГОВОРА:\n"
				for _, msg := range messages {
					conversationHistory += msg + "\n"
				}
				conversationHistory += "\nПродолжи разговор, учитывая этот контекст. Если пользователь спросит \"о чем мы говорили\", ссылайся на этот контекст."
			}
		} else {
			log.Warnf("Failed to get conversation history for user %d: %v", *userID, err)
		}
	}

	// Получаем системный промпт
	systemPrompt := s.getSystemPrompt(ctx, selectedVoice, conversationHistory, userID)

	// Формируем конфигурацию сессии
	sessionConfig := OpenAISessionConfig{}
	sessionConfig.Session.Type = "realtime"
	sessionConfig.Session.Model = selectedModel
	sessionConfig.Session.Audio.Output.Voice = selectedVoice
	sessionConfig.Session.Instructions = systemPrompt

	log.Infof("🎙️ Creating session with model: %s, voice: %s for user: %v", selectedModel, selectedVoice, userID)

	// Делаем запрос к OpenAI
	body, err := json.Marshal(sessionConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal session config: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", config.AppConfig.OpenAIRealtimeURL, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+config.AppConfig.OpenAIAPIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Errorf("OpenAI API error: %s - %s", resp.Status, string(bodyBytes))
		return nil, fmt.Errorf("OpenAI API returned status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return result, nil
}

func (s *OpenAIService) getSystemPrompt(ctx context.Context, voice string, conversationHistory string, userID *int) string {
	baseContext := conversationHistory
	promptContent := ""

	// Пытаемся получить пользовательский промпт
	if userID != nil {
		conn := database.Database.Pool

		var content, voiceGender *string
		err := conn.QueryRow(ctx, `
			SELECT vp.content, vp.voice_gender
			FROM users u
			LEFT JOIN voice_prompts vp ON u.selected_prompt_id = vp.id
			WHERE u.id = $1 AND (vp.is_active = true OR vp.id IS NULL)
		`, *userID).Scan(&content, &voiceGender)

		if err == nil && content != nil {
			promptContent = *content

			// Добавляем инструкции для женских голосов
			if voice == "marin" || voice == "coral" || voice == "shimmer" ||
			   (voiceGender != nil && *voiceGender == "female") {
				promptContent += "\n\nВАЖНО: Ты используешь женский голос, поэтому всегда говори в женском роде (поняла вместо понял, готова вместо готов, и т.д.)."
			}

			promptContent += baseContext
			return promptContent
		}
	}

	// Дефолтный промпт для женских голосов
	if voice == "marin" || voice == "coral" || voice == "shimmer" {
		return `Ты дружелюбная и внимательная ИИ-ассистентка. Ты говоришь женским голосом и должна использовать женский род в речи.

Основные принципы:
- Используй женский род (поняла вместо понял, готова вместо готов, etc.)
- Говори естественно и дружелюбно
- Будь полезной и отзывчивой
- Отвечай кратко, но информативно
- Поддерживай живую беседу
- Всегда отвечай на том же языке, на котором к тебе обращается пользователь

Помни: ты не просто ИИ, а именно ассистентка с женским голосом, общайся соответственно.` + baseContext
	}

	// Общий дефолтный промпт
	return `Ты дружелюбный и полезный ИИ-ассистент. Отвечай естественно и по делу.

Основные принципы:
- Говори кратко, но информативно
- Будь полезным и отзывчивым
- Поддерживай живую беседу
- Всегда отвечай на том же языке, на котором к тебе обращается пользователь` + baseContext
}
