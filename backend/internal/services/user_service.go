package services

import (
	"context"
	"fmt"
	"voice-ai-backend/internal/database"
	"voice-ai-backend/internal/models"

	"github.com/jackc/pgx/v5"
)

type UserService struct{}

func NewUserService() *UserService {
	return &UserService{}
}

// CreateOrUpdateUser создает нового пользователя или обновляет существующего
func (s *UserService) CreateOrUpdateUser(ctx context.Context, req *models.CreateUserRequest, defaultTokenBalance int) (*models.UserResponse, error) {
	conn := database.Database.Pool

	var user models.User

	// Проверяем существование пользователя
	err := conn.QueryRow(ctx, `
		SELECT id, telegram_id, username, first_name, last_name, language_code,
		       is_premium, token_balance, selected_model, selected_voice, selected_prompt_id,
		       created_at, updated_at, last_active
		FROM users WHERE telegram_id = $1
	`, req.TelegramID).Scan(
		&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
		&user.LanguageCode, &user.IsPremium, &user.TokenBalance, &user.SelectedModel,
		&user.SelectedVoice, &user.SelectedPromptID, &user.CreatedAt, &user.UpdatedAt, &user.LastActive,
	)

	if err == pgx.ErrNoRows {
		// Создаем нового пользователя
		err = conn.QueryRow(ctx, `
			INSERT INTO users (telegram_id, username, first_name, last_name, language_code, token_balance, created_at, updated_at, last_active)
			VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			RETURNING id, telegram_id, username, first_name, last_name, language_code,
			          is_premium, token_balance, selected_model, selected_voice, selected_prompt_id,
			          created_at, updated_at, last_active
		`, req.TelegramID, req.Username, req.FirstName, req.LastName, req.LanguageCode, defaultTokenBalance).Scan(
			&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
			&user.LanguageCode, &user.IsPremium, &user.TokenBalance, &user.SelectedModel,
			&user.SelectedVoice, &user.SelectedPromptID, &user.CreatedAt, &user.UpdatedAt, &user.LastActive,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}
	} else if err != nil {
		return nil, fmt.Errorf("failed to query user: %w", err)
	} else {
		// Обновляем существующего пользователя
		err = conn.QueryRow(ctx, `
			UPDATE users
			SET username = $2, first_name = $3, last_name = $4, language_code = $5,
			    last_active = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
			WHERE telegram_id = $1
			RETURNING id, telegram_id, username, first_name, last_name, language_code,
			          is_premium, token_balance, selected_model, selected_voice, selected_prompt_id,
			          created_at, updated_at, last_active
		`, req.TelegramID, req.Username, req.FirstName, req.LastName, req.LanguageCode).Scan(
			&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
			&user.LanguageCode, &user.IsPremium, &user.TokenBalance, &user.SelectedModel,
			&user.SelectedVoice, &user.SelectedPromptID, &user.CreatedAt, &user.UpdatedAt, &user.LastActive,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to update user: %w", err)
		}

		// Если у пользователя нет token_balance, устанавливаем дефолтное значение
		if user.TokenBalance == 0 {
			_, err = conn.Exec(ctx, `
				UPDATE users SET token_balance = $1 WHERE telegram_id = $2
			`, defaultTokenBalance, req.TelegramID)

			if err == nil {
				user.TokenBalance = defaultTokenBalance
			}
		}
	}

	// Проверяем активную подписку
	var planName *string
	err = conn.QueryRow(ctx, `
		SELECT sp.name
		FROM user_subscriptions us
		JOIN subscription_plans sp ON us.plan_id = sp.id
		WHERE us.user_id = $1 AND us.status = 'active' AND us.end_date > CURRENT_TIMESTAMP
		ORDER BY us.end_date DESC
		LIMIT 1
	`, user.ID).Scan(&planName)

	hasActiveSubscription := err == nil

	return &models.UserResponse{
		User:                  &user,
		HasActiveSubscription: hasActiveSubscription,
		CurrentPlanName:       planName,
	}, nil
}

// GetUserByTelegramID получает пользователя по telegram_id
func (s *UserService) GetUserByTelegramID(ctx context.Context, telegramID string) (*models.UserResponse, error) {
	conn := database.Database.Pool

	var user models.User
	err := conn.QueryRow(ctx, `
		SELECT id, telegram_id, username, first_name, last_name, language_code,
		       is_premium, token_balance, selected_model, selected_voice, selected_prompt_id,
		       created_at, updated_at, last_active
		FROM users WHERE telegram_id = $1
	`, telegramID).Scan(
		&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
		&user.LanguageCode, &user.IsPremium, &user.TokenBalance, &user.SelectedModel,
		&user.SelectedVoice, &user.SelectedPromptID, &user.CreatedAt, &user.UpdatedAt, &user.LastActive,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	var planName *string
	err = conn.QueryRow(ctx, `
		SELECT sp.name
		FROM user_subscriptions us
		JOIN subscription_plans sp ON us.plan_id = sp.id
		WHERE us.user_id = $1 AND us.status = 'active' AND us.end_date > CURRENT_TIMESTAMP
		ORDER BY us.end_date DESC LIMIT 1
	`, user.ID).Scan(&planName)

	hasActiveSubscription := err == nil

	return &models.UserResponse{
		User:                  &user,
		HasActiveSubscription: hasActiveSubscription,
		CurrentPlanName:       planName,
	}, nil
}

// GetUserByID получает пользователя по ID
func (s *UserService) GetUserByID(ctx context.Context, userID int) (*models.UserResponse, error) {
	conn := database.Database.Pool

	var user models.User
	err := conn.QueryRow(ctx, `
		SELECT id, telegram_id, username, first_name, last_name, language_code,
		       is_premium, token_balance, selected_model, selected_voice, selected_prompt_id,
		       created_at, updated_at, last_active
		FROM users WHERE id = $1
	`, userID).Scan(
		&user.ID, &user.TelegramID, &user.Username, &user.FirstName, &user.LastName,
		&user.LanguageCode, &user.IsPremium, &user.TokenBalance, &user.SelectedModel,
		&user.SelectedVoice, &user.SelectedPromptID, &user.CreatedAt, &user.UpdatedAt, &user.LastActive,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	var planName *string
	err = conn.QueryRow(ctx, `
		SELECT sp.name
		FROM user_subscriptions us
		JOIN subscription_plans sp ON us.plan_id = sp.id
		WHERE us.user_id = $1 AND us.status = 'active' AND us.end_date > CURRENT_TIMESTAMP
		ORDER BY us.end_date DESC LIMIT 1
	`, user.ID).Scan(&planName)

	hasActiveSubscription := err == nil

	return &models.UserResponse{
		User:                  &user,
		HasActiveSubscription: hasActiveSubscription,
		CurrentPlanName:       planName,
	}, nil
}

// UpdateSelectedModel обновляет выбранную модель пользователя
func (s *UserService) UpdateSelectedModel(ctx context.Context, userID int, selectedModel string) error {
	conn := database.Database.Pool

	// Валидация модели
	if selectedModel != "gpt-realtime" && selectedModel != "gpt-realtime-mini" {
		return fmt.Errorf("invalid model: must be gpt-realtime or gpt-realtime-mini")
	}

	result, err := conn.Exec(ctx, `
		UPDATE users
		SET selected_model = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, selectedModel, userID)

	if err != nil {
		return fmt.Errorf("failed to update selected model: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// UpdateSelectedVoice обновляет выбранный голос пользователя
func (s *UserService) UpdateSelectedVoice(ctx context.Context, userID int, selectedVoice string) error {
	conn := database.Database.Pool

	// Валидация голоса
	validVoices := []string{"alloy", "ash", "ballad", "cedar", "coral", "echo", "marin", "sage", "shimmer", "verse"}
	isValid := false
	for _, v := range validVoices {
		if v == selectedVoice {
			isValid = true
			break
		}
	}

	if !isValid {
		return fmt.Errorf("invalid voice: must be one of %v", validVoices)
	}

	result, err := conn.Exec(ctx, `
		UPDATE users
		SET selected_voice = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, selectedVoice, userID)

	if err != nil {
		return fmt.Errorf("failed to update selected voice: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}

	log.Infof("✅ User %d selected voice: %s", userID, selectedVoice)

	return nil
}

// GetSelectedVoice получает выбранный голос пользователя
func (s *UserService) GetSelectedVoice(ctx context.Context, userID int) (string, error) {
	conn := database.Database.Pool

	var selectedVoice *string
	err := conn.QueryRow(ctx, `
		SELECT selected_voice FROM users WHERE id = $1
	`, userID).Scan(&selectedVoice)

	if err == pgx.ErrNoRows {
		return "", fmt.Errorf("user not found")
	}
	if err != nil {
		return "", fmt.Errorf("failed to get selected voice: %w", err)
	}

	if selectedVoice == nil {
		return "ash", nil // default voice
	}

	return *selectedVoice, nil
}
