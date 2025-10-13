package services

import (
	"context"
	"encoding/json"
	"fmt"
	"voice-ai-backend/internal/database"
	"voice-ai-backend/internal/models"
)

type ActivityService struct{}

func NewActivityService() *ActivityService {
	return &ActivityService{}
}

// LogActivity логирует активность пользователя
func (s *ActivityService) LogActivity(ctx context.Context, req *models.LogActivityRequest) (int, error) {
	conn := database.Database.Pool

	metadataJSON, err := json.Marshal(req.Metadata)
	if err != nil {
		metadataJSON = []byte("{}")
	}

	var activityID int
	err = conn.QueryRow(ctx, `
		INSERT INTO user_activity (user_id, action, metadata, ip_address, user_agent, created_at)
		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
		RETURNING id
	`, req.UserID, req.Action, metadataJSON, req.IPAddress, req.UserAgent).Scan(&activityID)

	if err != nil {
		return 0, fmt.Errorf("failed to log activity: %w", err)
	}

	return activityID, nil
}

// GetUserActivities получает активность пользователя
func (s *ActivityService) GetUserActivities(ctx context.Context, userID int, limit int) ([]models.UserActivity, error) {
	conn := database.Database.Pool

	rows, err := conn.Query(ctx, `
		SELECT id, user_id, action, metadata, ip_address, user_agent, created_at
		FROM user_activity
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)

	if err != nil {
		return nil, fmt.Errorf("failed to get activities: %w", err)
	}
	defer rows.Close()

	var activities []models.UserActivity
	for rows.Next() {
		var activity models.UserActivity
		var metadataJSON []byte

		err := rows.Scan(
			&activity.ID, &activity.UserID, &activity.Action,
			&metadataJSON, &activity.IPAddress, &activity.UserAgent, &activity.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan activity: %w", err)
		}

		// Парсим JSON metadata
		if len(metadataJSON) > 0 {
			err = json.Unmarshal(metadataJSON, &activity.Metadata)
			if err != nil {
				activity.Metadata = make(map[string]interface{})
			}
		}

		activities = append(activities, activity)
	}

	return activities, nil
}
