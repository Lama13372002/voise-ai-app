package services

import (
	"context"
	"fmt"
	"voice-ai-backend/internal/database"
	"voice-ai-backend/internal/models"

	"github.com/jackc/pgx/v5"
	log "github.com/sirupsen/logrus"
)

type PromptService struct{}

func NewPromptService() *PromptService {
	return &PromptService{}
}

// GetUserPrompts получает все промпты доступные пользователю
func (s *PromptService) GetUserPrompts(ctx context.Context, userID int) (*models.PromptsResponse, error) {
	conn := database.Database.Pool

	// Получаем уровень плана пользователя
	var planName string
	var planLevel int
	err := conn.QueryRow(ctx, `
		SELECT
			COALESCE(sp.name, 'Бесплатный план') as plan_name,
			CASE
				WHEN sp.name = 'Базовый' THEN 1
				WHEN sp.name = 'Премиум' THEN 2
				WHEN sp.name = 'Про' THEN 3
				ELSE 1
			END as plan_level
		FROM users u
		LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
		LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
		WHERE u.id = $1
	`, userID).Scan(&planName, &planLevel)

	if err != nil && err != pgx.ErrNoRows {
		return nil, fmt.Errorf("failed to get user plan: %w", err)
	}

	if err == pgx.ErrNoRows {
		planName = "Бесплатный план"
		planLevel = 1
	}

	// Получаем базовые промпты в зависимости от уровня плана
	var basePrompts []models.VoicePrompt
	var baseQuery string
	var baseArgs []interface{}

	if planLevel == 3 {
		// Для Про плана - все базовые промпты
		baseQuery = `
			SELECT id, title, description, content, plan_required, category, voice_gender, is_active, created_at
			FROM voice_prompts
			WHERE is_base = true AND is_active = true
			ORDER BY plan_required ASC, title ASC
		`
	} else {
		// Для остальных планов - по уровню доступа
		baseQuery = `
			SELECT id, title, description, content, plan_required, category, voice_gender, is_active, created_at
			FROM voice_prompts
			WHERE is_base = true AND plan_required <= $1 AND is_active = true
			ORDER BY plan_required ASC, title ASC
		`
		baseArgs = []interface{}{planLevel}
	}

	rows, err := conn.Query(ctx, baseQuery, baseArgs...)
	if err != nil {
		return nil, fmt.Errorf("failed to query base prompts: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var prompt models.VoicePrompt
		err := rows.Scan(&prompt.ID, &prompt.Title, &prompt.Description, &prompt.Content,
			&prompt.PlanRequired, &prompt.Category, &prompt.VoiceGender, &prompt.IsActive, &prompt.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan base prompt: %w", err)
		}
		basePrompts = append(basePrompts, prompt)
	}

	// Получаем пользовательские промпты
	var userPrompts []models.VoicePrompt
	userRows, err := conn.Query(ctx, `
		SELECT id, title, description, content, category, voice_gender, is_active, created_at
		FROM voice_prompts
		WHERE user_id = $1 AND is_base = false AND is_active = true
		ORDER BY created_at DESC
	`, userID)

	if err != nil {
		return nil, fmt.Errorf("failed to query user prompts: %w", err)
	}
	defer userRows.Close()

	for userRows.Next() {
		var prompt models.VoicePrompt
		prompt.UserID = &userID
		err := rows.Scan(&prompt.ID, &prompt.Title, &prompt.Description, &prompt.Content,
			&prompt.Category, &prompt.VoiceGender, &prompt.IsActive, &prompt.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user prompt: %w", err)
		}
		userPrompts = append(userPrompts, prompt)
	}

	// Получаем выбранный промпт пользователя
	var selectedPromptID *int
	err = conn.QueryRow(ctx, `
		SELECT selected_prompt_id FROM users WHERE id = $1
	`, userID).Scan(&selectedPromptID)

	// Подсчитываем лимиты
	userPromptCount := len(userPrompts)
	var maxUserPrompts int

	switch planLevel {
	case 1:
		maxUserPrompts = 0
	case 2:
		maxUserPrompts = 3
	case 3:
		maxUserPrompts = -1 // неограниченно
	}

	return &models.PromptsResponse{
		UserPlan: models.PlanLevel{
			PlanName:  planName,
			PlanLevel: planLevel,
		},
		BasePrompts:      basePrompts,
		UserPrompts:      userPrompts,
		SelectedPromptID: selectedPromptID,
		PromptLimits: models.PromptLimits{
			Current:       userPromptCount,
			Max:           maxUserPrompts,
			CanCreateMore: maxUserPrompts == -1 || userPromptCount < maxUserPrompts,
		},
	}, nil
}

// CreatePrompt создает новый пользовательский промпт
func (s *PromptService) CreatePrompt(ctx context.Context, req *models.CreatePromptRequest) (*models.VoicePrompt, error) {
	conn := database.Database.Pool

	// Проверяем лимиты пользователя
	var planLevel int
	err := conn.QueryRow(ctx, `
		SELECT
			CASE
				WHEN sp.name = 'Базовый' THEN 1
				WHEN sp.name = 'Премиум' THEN 2
				WHEN sp.name = 'Про' THEN 3
				ELSE 1
			END as plan_level
		FROM users u
		LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
		LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
		WHERE u.id = $1
	`, req.UserID).Scan(&planLevel)

	if err != nil && err != pgx.ErrNoRows {
		return nil, fmt.Errorf("failed to get user plan level: %w", err)
	}

	if err == pgx.ErrNoRows {
		planLevel = 1
	}

	// Подсчитываем существующие промпты
	var currentCount int
	err = conn.QueryRow(ctx, `
		SELECT COUNT(*) FROM voice_prompts
		WHERE user_id = $1 AND is_base = false AND is_active = true
	`, req.UserID).Scan(&currentCount)

	if err != nil {
		return nil, fmt.Errorf("failed to count user prompts: %w", err)
	}

	// Проверяем лимит
	var maxPrompts int
	switch planLevel {
	case 1:
		maxPrompts = 0
	case 2:
		maxPrompts = 3
	case 3:
		maxPrompts = -1
	}

	if maxPrompts != -1 && currentCount >= maxPrompts {
		return nil, fmt.Errorf("prompt limit reached: %d/%d", currentCount, maxPrompts)
	}

	// Создаем промпт
	var prompt models.VoicePrompt
	err = conn.QueryRow(ctx, `
		INSERT INTO voice_prompts (user_id, title, description, content, category, voice_gender, is_base, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, false, CURRENT_TIMESTAMP)
		RETURNING id, user_id, title, description, content, category, voice_gender, is_base, is_active, created_at
	`, req.UserID, req.Title, req.Description, req.Content, req.Category, req.VoiceGender).Scan(
		&prompt.ID, &prompt.UserID, &prompt.Title, &prompt.Description, &prompt.Content,
		&prompt.Category, &prompt.VoiceGender, &prompt.IsBase, &prompt.IsActive, &prompt.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create prompt: %w", err)
	}

	return &prompt, nil
}

// SelectPrompt выбирает промпт для пользователя
func (s *PromptService) SelectPrompt(ctx context.Context, userID int, promptID int) error {
	conn := database.Database.Pool

	// Проверяем доступность промпта для пользователя
	var exists bool
	err := conn.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM voice_prompts vp
			LEFT JOIN users u ON u.id = $1
			LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
			LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
			WHERE vp.id = $2
				AND vp.is_active = true
				AND (
					vp.user_id = $1 OR
					(vp.is_base = true AND (
						COALESCE(sp.name, 'Бесплатный план') = 'Про' OR
						vp.plan_required <= COALESCE(
							CASE
								WHEN sp.name = 'Базовый' THEN 1
								WHEN sp.name = 'Премиум' THEN 2
								WHEN sp.name = 'Про' THEN 3
								ELSE 1
							END, 1
						)
					))
				)
		)
	`, userID, promptID).Scan(&exists)

	if err != nil {
		return fmt.Errorf("failed to check prompt availability: %w", err)
	}

	if !exists {
		return fmt.Errorf("prompt not found or not accessible")
	}

	// Обновляем выбранный промпт
	result, err := conn.Exec(ctx, `
		UPDATE users
		SET selected_prompt_id = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, promptID, userID)

	if err != nil {
		return fmt.Errorf("failed to select prompt: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}

	log.Infof("✅ User %d selected prompt %d", userID, promptID)

	return nil
}

// DeletePrompt удаляет пользовательский промпт (мягкое удаление)
func (s *PromptService) DeletePrompt(ctx context.Context, userID int, promptID int) (bool, error) {
	conn := database.Database.Pool

	// Начинаем транзакцию
	tx, err := conn.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Проверяем, что промпт принадлежит пользователю и не базовый
	var exists bool
	err = tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM voice_prompts
			WHERE id = $1 AND user_id = $2 AND is_base = false
		)
	`, promptID, userID).Scan(&exists)

	if err != nil {
		return false, fmt.Errorf("failed to check prompt ownership: %w", err)
	}

	if !exists {
		return false, fmt.Errorf("prompt not found or cannot be deleted")
	}

	// Проверяем, выбран ли этот промпт
	var selectedPromptID *int
	err = tx.QueryRow(ctx, `
		SELECT selected_prompt_id FROM users WHERE id = $1
	`, userID).Scan(&selectedPromptID)

	if err != nil {
		return false, fmt.Errorf("failed to get user selected prompt: %w", err)
	}

	isSelected := selectedPromptID != nil && *selectedPromptID == promptID

	// Если промпт выбран, сбрасываем на дефолтный
	if isSelected {
		var defaultPromptID *int
		err = tx.QueryRow(ctx, `
			SELECT id FROM voice_prompts
			WHERE is_base = true AND plan_required = 1
			ORDER BY id ASC LIMIT 1
		`).Scan(&defaultPromptID)

		if err == nil && defaultPromptID != nil {
			_, err = tx.Exec(ctx, `
				UPDATE users
				SET selected_prompt_id = $1, updated_at = CURRENT_TIMESTAMP
				WHERE id = $2
			`, *defaultPromptID, userID)

			if err != nil {
				return false, fmt.Errorf("failed to reset prompt selection: %w", err)
			}
		}
	}

	// Мягкое удаление промпта
	_, err = tx.Exec(ctx, `
		UPDATE voice_prompts
		SET is_active = false
		WHERE id = $1
	`, promptID)

	if err != nil {
		return false, fmt.Errorf("failed to delete prompt: %w", err)
	}

	// Коммитим транзакцию
	if err = tx.Commit(ctx); err != nil {
		return false, fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Infof("✅ User %d deleted prompt %d (was selected: %v)", userID, promptID, isSelected)

	return isSelected, nil
}
