package services

import (
	"context"
	"fmt"
	"voice-ai-backend/internal/database"
	"voice-ai-backend/internal/models"
)

type ConversationService struct{}

func NewConversationService() *ConversationService {
	return &ConversationService{}
}

// GetUserConversation получает историю разговора пользователя
func (s *ConversationService) GetUserConversation(ctx context.Context, userID int, limit int) ([]models.ConversationMessage, error) {
	conn := database.Database.Pool

	rows, err := conn.Query(ctx, `
		SELECT role, content, msg_timestamp
		FROM get_user_conversation_context($1, $2)
		ORDER BY msg_timestamp ASC
	`, userID, limit)

	if err != nil {
		return nil, fmt.Errorf("failed to query conversation: %w", err)
	}
	defer rows.Close()

	var messages []models.ConversationMessage
	for rows.Next() {
		var msg models.ConversationMessage
		err := rows.Scan(&msg.MessageType, &msg.Content, &msg.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}
		messages = append(messages, msg)
	}

	return messages, nil
}

// SaveMessage сохраняет сообщение в историю разговора
func (s *ConversationService) SaveMessage(ctx context.Context, req *models.SaveConversationRequest) (int, error) {
	conn := database.Database.Pool

	var messageID int
	err := conn.QueryRow(ctx, `
		INSERT INTO conversation_messages (user_id, session_id, message_type, content, audio_duration_seconds, created_at)
		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
		RETURNING id
	`, req.UserID, req.SessionID, req.MessageType, req.Content, req.AudioDurationSeconds).Scan(&messageID)

	if err != nil {
		return 0, fmt.Errorf("failed to save message: %w", err)
	}

	return messageID, nil
}
