package services

import (
	"context"
	"fmt"
	"voice-ai-backend/internal/database"
	"voice-ai-backend/internal/models"
)

type PlanService struct{}

func NewPlanService() *PlanService {
	return &PlanService{}
}

// GetAllPlans получает все активные планы подписок
func (s *PlanService) GetAllPlans(ctx context.Context) ([]models.SubscriptionPlan, error) {
	conn := database.Database.Pool

	rows, err := conn.Query(ctx, `
		SELECT id, name, description, price, currency, token_amount, features, is_active, created_at
		FROM subscription_plans
		WHERE is_active = true
		ORDER BY price ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query plans: %w", err)
	}
	defer rows.Close()

	var plans []models.SubscriptionPlan
	for rows.Next() {
		var plan models.SubscriptionPlan
		err := rows.Scan(
			&plan.ID, &plan.Name, &plan.Description, &plan.Price, &plan.Currency,
			&plan.TokenAmount, &plan.Features, &plan.IsActive, &plan.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan plan: %w", err)
		}
		plans = append(plans, plan)
	}

	return plans, nil
}

// GetUserPlans получает планы пользователя (активные и закрытые)
func (s *PlanService) GetUserPlans(ctx context.Context, userID int) (*models.UserPlansResponse, error) {
	conn := database.Database.Pool

	// Получаем активные планы
	activePlans, err := s.getUserPlansByStatus(ctx, userID, []string{"active"})
	if err != nil {
		return nil, err
	}

	// Получаем закрытые планы
	closedPlans, err := s.getUserPlansByStatus(ctx, userID, []string{"expired", "cancelled"})
	if err != nil {
		return nil, err
	}

	return &models.UserPlansResponse{
		ActivePlans: activePlans,
		ClosedPlans: closedPlans,
	}, nil
}

func (s *PlanService) getUserPlansByStatus(ctx context.Context, userID int, statuses []string) ([]models.UserPlanDetails, error) {
	conn := database.Database.Pool

	query := `
		SELECT
			us.id,
			sp.name as plan_name,
			sp.token_amount,
			sp.features,
			us.start_date,
			us.end_date,
			us.status,
			COALESCE(SUM(tu.cost_tokens), 0) as tokens_used
		FROM user_subscriptions us
		JOIN subscription_plans sp ON us.plan_id = sp.id
		LEFT JOIN token_usage tu ON tu.user_id = us.user_id
			AND tu.created_at >= us.start_date
			AND (us.end_date IS NULL OR tu.created_at <= us.end_date)
		WHERE us.user_id = $1 AND us.status = ANY($2)
		GROUP BY us.id, sp.name, sp.token_amount, sp.features, us.start_date, us.end_date, us.status
		ORDER BY us.created_at DESC
	`

	rows, err := conn.Query(ctx, query, userID, statuses)
	if err != nil {
		return nil, fmt.Errorf("failed to query user plans: %w", err)
	}
	defer rows.Close()

	var plans []models.UserPlanDetails
	for rows.Next() {
		var plan models.UserPlanDetails
		err := rows.Scan(
			&plan.ID, &plan.PlanName, &plan.TokenAmount, &plan.Features,
			&plan.StartDate, &plan.EndDate, &plan.Status, &plan.TokensUsed,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user plan: %w", err)
		}

		plan.TokensRemaining = plan.TokenAmount - plan.TokensUsed
		if plan.TokensRemaining < 0 {
			plan.TokensRemaining = 0
		}

		plans = append(plans, plan)
	}

	return plans, nil
}

// CreateSubscription создает новую подписку для пользователя
func (s *PlanService) CreateSubscription(ctx context.Context, req *models.CreateSubscriptionRequest) (int, int, error) {
	conn := database.Database.Pool

	// Начинаем транзакцию
	tx, err := conn.Begin(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Используем функцию из БД для закрытия старых подписок и установки нового баланса
	var subscriptionID, newTokenBalance int
	err = tx.QueryRow(ctx, `
		SELECT subscription_id, new_token_balance
		FROM close_old_subscription_and_reset_tokens($1, $2, $3)
	`, req.UserID, req.PlanID, req.PaymentID).Scan(&subscriptionID, &newTokenBalance)

	if err != nil {
		return 0, 0, fmt.Errorf("failed to create subscription: %w", err)
	}

	// Коммитим транзакцию
	if err = tx.Commit(ctx); err != nil {
		return 0, 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return subscriptionID, newTokenBalance, nil
}

// GetCurrentUserPlan получает текущий активный план пользователя с детализацией
func (s *PlanService) GetCurrentUserPlan(ctx context.Context, userID int) (map[string]interface{}, error) {
	conn := database.Database.Pool

	query := `
		SELECT
			us.id as subscription_id,
			us.start_date,
			us.end_date,
			us.status,
			sp.name as plan_name,
			sp.token_amount,
			sp.features,
			u.token_balance,
			COALESCE(SUM(tu.cost_tokens), 0) as tokens_used_in_plan
		FROM users u
		LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
		LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
		LEFT JOIN token_usage tu ON tu.user_id = u.id
			AND us.start_date IS NOT NULL
			AND tu.created_at >= us.start_date
			AND (us.end_date IS NULL OR tu.created_at <= us.end_date)
		WHERE u.id = $1
		GROUP BY us.id, us.start_date, us.end_date, us.status, sp.name, sp.token_amount, sp.features, u.token_balance
		ORDER BY us.created_at DESC
		LIMIT 1
	`

	var subscriptionID *int
	var startDate, endDate interface{}
	var status, planName *string
	var tokenAmount *int
	var features interface{}
	var tokenBalance int
	var tokensUsedInPlan int

	err := conn.QueryRow(ctx, query, userID).Scan(
		&subscriptionID, &startDate, &endDate, &status,
		&planName, &tokenAmount, &features, &tokenBalance, &tokensUsedInPlan,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get current plan: %w", err)
	}

	// Если у пользователя есть активная подписка
	if subscriptionID != nil && status != nil && *status == "active" {
		tokensRemainingInPlan := 0
		if tokenAmount != nil {
			tokensRemainingInPlan = *tokenAmount - tokensUsedInPlan
			if tokensRemainingInPlan < 0 {
				tokensRemainingInPlan = 0
			}
		}

		// Проверяем, не закончились ли токены в плане
		shouldClosePlan := tokensRemainingInPlan <= 0

		if shouldClosePlan {
			// Автоматически закрываем план
			_, err = conn.Exec(ctx, `
				UPDATE user_subscriptions
				SET status = 'expired', end_date = NOW(), updated_at = NOW()
				WHERE id = $1
			`, *subscriptionID)

			if err != nil {
				log.Errorf("Failed to close expired subscription: %v", err)
			}

			return map[string]interface{}{
				"success":                 true,
				"has_active_subscription": false,
				"current_plan_name":       "Бесплатный план",
				"plan_expired":            true,
			}, nil
		}

		result := map[string]interface{}{
			"success":                     true,
			"has_active_subscription":     true,
			"current_plan_name":           *planName,
			"subscription_id":             *subscriptionID,
			"plan_token_amount":           *tokenAmount,
			"tokens_used_in_plan":         tokensUsedInPlan,
			"tokens_remaining_in_plan":    tokensRemainingInPlan,
			"start_date":                  startDate,
			"end_date":                    endDate,
			"features":                    features,
		}

		return result, nil
	}

	// Нет активной подписки
	return map[string]interface{}{
		"success":                 true,
		"has_active_subscription": false,
		"current_plan_name":       "Бесплатный план",
	}, nil
}
