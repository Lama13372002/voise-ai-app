package services

import (
	"context"
	"fmt"
	"voice-ai-backend/internal/database"
	"voice-ai-backend/internal/models"

	"github.com/jackc/pgx/v5"
	log "github.com/sirupsen/logrus"
)

type TokenService struct{}

func NewTokenService() *TokenService {
	return &TokenService{}
}

// GetTokenBalance получает баланс токенов пользователя
func (s *TokenService) GetTokenBalance(ctx context.Context, userID int) (int, error) {
	conn := database.Database.Pool

	var tokenBalance int
	err := conn.QueryRow(ctx, `
		SELECT token_balance FROM users WHERE id = $1
	`, userID).Scan(&tokenBalance)

	if err == pgx.ErrNoRows {
		return 0, fmt.Errorf("user not found")
	}
	if err != nil {
		return 0, fmt.Errorf("failed to get token balance: %w", err)
	}

	return tokenBalance, nil
}

// DeductTokens списывает токены с баланса пользователя
func (s *TokenService) DeductTokens(ctx context.Context, req *models.TokenUsageRequest) (*models.TokenUsageResponse, error) {
	conn := database.Database.Pool

	// Извлекаем данные о токенах
	totalTokens := req.Usage.TotalTokens
	inputTokens := req.Usage.InputTokens
	outputTokens := req.Usage.OutputTokens

	var inputTextTokens, inputAudioTokens, inputImageTokens, cachedTokens int
	var outputTextTokens, outputAudioTokens int

	if req.Usage.InputTokenDetails != nil {
		inputTextTokens = req.Usage.InputTokenDetails.TextTokens
		inputAudioTokens = req.Usage.InputTokenDetails.AudioTokens
		inputImageTokens = req.Usage.InputTokenDetails.ImageTokens
		cachedTokens = req.Usage.InputTokenDetails.CachedTokens
	}

	if req.Usage.OutputTokenDetails != nil {
		outputTextTokens = req.Usage.OutputTokenDetails.TextTokens
		outputAudioTokens = req.Usage.OutputTokenDetails.AudioTokens
	}

	log.Infof("📊 Token usage: total=%d, input=%d (text=%d, audio=%d, image=%d, cached=%d), output=%d (text=%d, audio=%d)",
		totalTokens, inputTokens, inputTextTokens, inputAudioTokens, inputImageTokens, cachedTokens,
		outputTokens, outputTextTokens, outputAudioTokens)

	// Начинаем транзакцию
	tx, err := conn.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Проверяем текущий баланс
	var currentBalance int
	err = tx.QueryRow(ctx, `
		SELECT token_balance FROM users WHERE id = $1
	`, req.UserID).Scan(&currentBalance)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get token balance: %w", err)
	}

	// Проверяем достаточность токенов
	if currentBalance < totalTokens {
		return nil, fmt.Errorf("insufficient tokens: have %d, need %d", currentBalance, totalTokens)
	}

	// Если это только проверка, возвращаем результат без списания
	if req.CheckOnly {
		return &models.TokenUsageResponse{
			TokensUsed: 0,
			NewBalance: currentBalance,
		}, nil
	}

	// Списываем токены
	newBalance := currentBalance - totalTokens
	_, err = tx.Exec(ctx, `
		UPDATE users
		SET token_balance = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, newBalance, req.UserID)

	if err != nil {
		return nil, fmt.Errorf("failed to deduct tokens: %w", err)
	}

	// Логируем использование токенов
	_, err = tx.Exec(ctx, `
		INSERT INTO token_usage (
			user_id, session_id, input_tokens, output_tokens, total_tokens, cost_tokens,
			input_text_tokens, input_audio_tokens, input_image_tokens, cached_tokens,
			output_text_tokens, output_audio_tokens, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
	`, req.UserID, req.SessionID, inputTokens, outputTokens, totalTokens, totalTokens,
		inputTextTokens, inputAudioTokens, inputImageTokens, cachedTokens,
		outputTextTokens, outputAudioTokens)

	if err != nil {
		return nil, fmt.Errorf("failed to log token usage: %w", err)
	}

	// Коммитим транзакцию
	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Infof("✅ Deducted %d tokens from user %d. New balance: %d", totalTokens, req.UserID, newBalance)

	return &models.TokenUsageResponse{
		TokensUsed: totalTokens,
		NewBalance: newBalance,
		UsageBreakdown: &models.UsageBreakdown{
			Input: models.TokenBreakdown{
				Total:  inputTokens,
				Text:   inputTextTokens,
				Audio:  inputAudioTokens,
				Image:  inputImageTokens,
				Cached: cachedTokens,
			},
			Output: models.TokenBreakdown{
				Total: outputTokens,
				Text:  outputTextTokens,
				Audio: outputAudioTokens,
			},
			Total: totalTokens,
		},
	}, nil
}

// AddTokens пополняет баланс токенов
func (s *TokenService) AddTokens(ctx context.Context, userID int, tokensToAdd int) (int, error) {
	conn := database.Database.Pool

	var newBalance int
	err := conn.QueryRow(ctx, `
		UPDATE users
		SET token_balance = token_balance + $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
		RETURNING token_balance
	`, tokensToAdd, userID).Scan(&newBalance)

	if err == pgx.ErrNoRows {
		return 0, fmt.Errorf("user not found")
	}
	if err != nil {
		return 0, fmt.Errorf("failed to add tokens: %w", err)
	}

	log.Infof("✅ Added %d tokens to user %d. New balance: %d", tokensToAdd, userID, newBalance)

	return newBalance, nil
}
