package services

import (
	"context"
	"fmt"
	"voice-ai-backend/internal/database"
	"voice-ai-backend/internal/models"

	"github.com/jackc/pgx/v5"
	log "github.com/sirupsen/logrus"
)

type AdminService struct{}

func NewAdminService() *AdminService {
	return &AdminService{}
}

// GetAllPlansForAdmin получает все планы (включая неактивные) для админки
func (s *AdminService) GetAllPlansForAdmin(ctx context.Context) ([]models.SubscriptionPlan, error) {
	conn := database.Database.Pool

	rows, err := conn.Query(ctx, `
		SELECT id, name, description, price, currency, token_amount, features, is_active, created_at
		FROM subscription_plans
		ORDER BY id ASC
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

// CreatePlan создает новый план подписки
func (s *AdminService) CreatePlan(ctx context.Context, req *models.CreatePlanRequest) (*models.SubscriptionPlan, error) {
	conn := database.Database.Pool

	var plan models.SubscriptionPlan
	err := conn.QueryRow(ctx, `
		INSERT INTO subscription_plans (name, description, price, currency, token_amount, features, is_active, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
		RETURNING id, name, description, price, currency, token_amount, features, is_active, created_at
	`, req.Name, req.Description, req.Price, req.Currency, req.TokenAmount, req.Features, req.IsActive).Scan(
		&plan.ID, &plan.Name, &plan.Description, &plan.Price, &plan.Currency,
		&plan.TokenAmount, &plan.Features, &plan.IsActive, &plan.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create plan: %w", err)
	}

	log.Infof("✅ Created new plan: %s (ID: %d)", plan.Name, plan.ID)

	return &plan, nil
}

// UpdatePlan обновляет существующий план
func (s *AdminService) UpdatePlan(ctx context.Context, req *models.UpdatePlanRequest) (*models.SubscriptionPlan, error) {
	conn := database.Database.Pool

	var plan models.SubscriptionPlan
	err := conn.QueryRow(ctx, `
		UPDATE subscription_plans
		SET name = $1, description = $2, price = $3, currency = $4,
		    token_amount = $5, features = $6, is_active = $7
		WHERE id = $8
		RETURNING id, name, description, price, currency, token_amount, features, is_active, created_at
	`, req.Name, req.Description, req.Price, req.Currency, req.TokenAmount, req.Features, req.IsActive, req.ID).Scan(
		&plan.ID, &plan.Name, &plan.Description, &plan.Price, &plan.Currency,
		&plan.TokenAmount, &plan.Features, &plan.IsActive, &plan.CreatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("plan not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update plan: %w", err)
	}

	log.Infof("✅ Updated plan: %s (ID: %d)", plan.Name, plan.ID)

	return &plan, nil
}

// DeletePlan удаляет план
func (s *AdminService) DeletePlan(ctx context.Context, planID int) error {
	conn := database.Database.Pool

	result, err := conn.Exec(ctx, `
		DELETE FROM subscription_plans WHERE id = $1
	`, planID)

	if err != nil {
		return fmt.Errorf("failed to delete plan: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("plan not found")
	}

	log.Infof("✅ Deleted plan ID: %d", planID)

	return nil
}
