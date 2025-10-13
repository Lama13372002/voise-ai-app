package services

import (
	"context"
	"fmt"
	"voice-ai-backend/internal/database"
	"voice-ai-backend/internal/models"
)

type SessionService struct{}

func NewSessionService() *SessionService {
	return &SessionService{}
}

// CreateVoiceSession создает запись о голосовой сессии
func (s *SessionService) CreateVoiceSession(ctx context.Context, req *models.CreateVoiceSessionRequest) (int, error) {
	conn := database.Database.Pool

	var sessionID int
	err := conn.QueryRow(ctx, `
		INSERT INTO voice_sessions (
			user_id, words_spoken, ai_responses, session_quality,
			context_summary, last_conversation_topic, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
		RETURNING id
	`, req.UserID, req.WordsSpoken, req.AIResponses, req.SessionQuality,
		req.ContextSummary, req.LastConversationTopic).Scan(&sessionID)

	if err != nil {
		return 0, fmt.Errorf("failed to create voice session: %w", err)
	}

	return sessionID, nil
}

// GetUserVoiceSessions получает сессии пользователя
func (s *SessionService) GetUserVoiceSessions(ctx context.Context, userID int, limit int) ([]models.VoiceSession, error) {
	conn := database.Database.Pool

	rows, err := conn.Query(ctx, `
		SELECT id, user_id, words_spoken, ai_responses, session_quality,
		       created_at, context_summary, last_conversation_topic
		FROM voice_sessions
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)

	if err != nil {
		return nil, fmt.Errorf("failed to get voice sessions: %w", err)
	}
	defer rows.Close()

	var sessions []models.VoiceSession
	for rows.Next() {
		var session models.VoiceSession
		err := rows.Scan(
			&session.ID, &session.UserID, &session.WordsSpoken, &session.AIResponses,
			&session.SessionQuality, &session.CreatedAt, &session.ContextSummary,
			&session.LastConversationTopic,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan voice session: %w", err)
		}

		sessions = append(sessions, session)
	}

	return sessions, nil
}

// GetSessionStats получает статистику по всем сессиям пользователя
func (s *SessionService) GetSessionStats(ctx context.Context, userID int) (map[string]interface{}, error) {
	conn := database.Database.Pool

	var totalSessions, totalWords, totalResponses int
	var avgQuality *float64

	err := conn.QueryRow(ctx, `
		SELECT
			COUNT(*) as total_sessions,
			COALESCE(SUM(words_spoken), 0) as total_words,
			COALESCE(SUM(ai_responses), 0) as total_responses,
			AVG(session_quality) as avg_quality
		FROM voice_sessions
		WHERE user_id = $1
	`, userID).Scan(&totalSessions, &totalWords, &totalResponses, &avgQuality)

	if err != nil {
		return nil, fmt.Errorf("failed to get session stats: %w", err)
	}

	return map[string]interface{}{
		"total_sessions":  totalSessions,
		"total_words":     totalWords,
		"total_responses": totalResponses,
		"avg_quality":     avgQuality,
	}, nil
}
