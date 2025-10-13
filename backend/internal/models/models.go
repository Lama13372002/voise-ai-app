package models

import "time"

// User represents a user in the system
type User struct {
	ID            int       `json:"id" db:"id"`
	TelegramID    string    `json:"telegram_id" db:"telegram_id"`
	Username      *string   `json:"username,omitempty" db:"username"`
	FirstName     string    `json:"first_name" db:"first_name"`
	LastName      *string   `json:"last_name,omitempty" db:"last_name"`
	LanguageCode  *string   `json:"language_code,omitempty" db:"language_code"`
	IsPremium     bool      `json:"is_premium" db:"is_premium"`
	TokenBalance  int       `json:"token_balance" db:"token_balance"`
	SelectedModel *string   `json:"selected_model,omitempty" db:"selected_model"`
	SelectedVoice *string   `json:"selected_voice,omitempty" db:"selected_voice"`
	SelectedPromptID *int   `json:"selected_prompt_id,omitempty" db:"selected_prompt_id"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
	LastActive    time.Time `json:"last_active" db:"last_active"`
}

// SubscriptionPlan represents a subscription plan
type SubscriptionPlan struct {
	ID          int       `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description *string   `json:"description,omitempty" db:"description"`
	Price       float64   `json:"price" db:"price"`
	Currency    string    `json:"currency" db:"currency"`
	TokenAmount int       `json:"token_amount" db:"token_amount"`
	Features    []string  `json:"features" db:"features"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// UserSubscription represents user's subscription
type UserSubscription struct {
	ID        int       `json:"id" db:"id"`
	UserID    int       `json:"user_id" db:"user_id"`
	PlanID    int       `json:"plan_id" db:"plan_id"`
	StartDate time.Time `json:"start_date" db:"start_date"`
	EndDate   *time.Time `json:"end_date,omitempty" db:"end_date"`
	Status    string    `json:"status" db:"status"`
	PaymentID *string   `json:"payment_id,omitempty" db:"payment_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// TokenUsage represents token usage log
type TokenUsage struct {
	ID               int       `json:"id" db:"id"`
	UserID           int       `json:"user_id" db:"user_id"`
	SessionID        string    `json:"session_id" db:"session_id"`
	InputTokens      int       `json:"input_tokens" db:"input_tokens"`
	OutputTokens     int       `json:"output_tokens" db:"output_tokens"`
	TotalTokens      int       `json:"total_tokens" db:"total_tokens"`
	CostTokens       int       `json:"cost_tokens" db:"cost_tokens"`
	InputTextTokens  int       `json:"input_text_tokens" db:"input_text_tokens"`
	InputAudioTokens int       `json:"input_audio_tokens" db:"input_audio_tokens"`
	InputImageTokens int       `json:"input_image_tokens" db:"input_image_tokens"`
	CachedTokens     int       `json:"cached_tokens" db:"cached_tokens"`
	OutputTextTokens int       `json:"output_text_tokens" db:"output_text_tokens"`
	OutputAudioTokens int      `json:"output_audio_tokens" db:"output_audio_tokens"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

// ConversationMessage represents a conversation message
type ConversationMessage struct {
	ID                   int       `json:"id" db:"id"`
	UserID               int       `json:"user_id" db:"user_id"`
	SessionID            *int      `json:"session_id,omitempty" db:"session_id"` // ИСПРАВЛЕНО: integer в БД
	MessageType          string    `json:"message_type" db:"message_type"` // 'user' or 'assistant'
	Content              string    `json:"content" db:"content"`
	AudioDurationSeconds int       `json:"audio_duration_seconds" db:"audio_duration_seconds"` // ИСПРАВЛЕНО: integer в БД
	CreatedAt            time.Time `json:"created_at" db:"created_at"`
}

// VoicePrompt represents AI voice prompt
type VoicePrompt struct {
	ID          int       `json:"id" db:"id"`
	UserID      *int      `json:"user_id,omitempty" db:"user_id"`
	Title       string    `json:"title" db:"title"`
	Description *string   `json:"description,omitempty" db:"description"`
	Content     string    `json:"content" db:"content"`
	IsBase      bool      `json:"is_base" db:"is_base"`
	PlanRequired int      `json:"plan_required" db:"plan_required"`
	Category    *string   `json:"category,omitempty" db:"category"`
	VoiceGender *string   `json:"voice_gender,omitempty" db:"voice_gender"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// UserActivity represents user activity log
type UserActivity struct {
	ID         int                    `json:"id" db:"id"`
	UserID     *int                   `json:"user_id,omitempty" db:"user_id"`
	Action     string                 `json:"action" db:"action"`
	Metadata   map[string]interface{} `json:"metadata" db:"metadata"`
	IPAddress  *string                `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent  *string                `json:"user_agent,omitempty" db:"user_agent"`
	CreatedAt  time.Time              `json:"created_at" db:"created_at"`
}

// VoiceSession represents voice session statistics
type VoiceSession struct {
	ID                    int       `json:"id" db:"id"`
	UserID                *int      `json:"user_id,omitempty" db:"user_id"`
	WordsSpoken           int       `json:"words_spoken" db:"words_spoken"`
	AIResponses           int       `json:"ai_responses" db:"ai_responses"`
	SessionQuality        *float64  `json:"session_quality,omitempty" db:"session_quality"`
	CreatedAt             time.Time `json:"created_at" db:"created_at"`
	ContextSummary        *string   `json:"context_summary,omitempty" db:"context_summary"`
	LastConversationTopic *string   `json:"last_conversation_topic,omitempty" db:"last_conversation_topic"`
}

// API Request/Response structures

type CreateUserRequest struct {
	TelegramID   string  `json:"telegram_id" binding:"required"`
	Username     *string `json:"username"`
	FirstName    string  `json:"first_name" binding:"required"`
	LastName     *string `json:"last_name"`
	LanguageCode *string `json:"language_code"`
}

type UpdateUserModelRequest struct {
	UserID        int    `json:"user_id" binding:"required"`
	SelectedModel string `json:"selected_model" binding:"required"`
}

type TokenUsageRequest struct {
	UserID    int                    `json:"user_id" binding:"required"`
	SessionID string                 `json:"session_id"`
	Usage     OpenAITokenUsage       `json:"usage" binding:"required"`
	CheckOnly bool                   `json:"check_only"`
}

type OpenAITokenUsage struct {
	TotalTokens         int                      `json:"total_tokens"`
	InputTokens         int                      `json:"input_tokens"`
	OutputTokens        int                      `json:"output_tokens"`
	InputTokenDetails   *OpenAITokenDetails      `json:"input_token_details"`
	OutputTokenDetails  *OpenAITokenDetails      `json:"output_token_details"`
}

type OpenAITokenDetails struct {
	TextTokens   int `json:"text_tokens"`
	AudioTokens  int `json:"audio_tokens"`
	ImageTokens  int `json:"image_tokens"`
	CachedTokens int `json:"cached_tokens"`
}

type SaveConversationRequest struct {
	UserID               int    `json:"user_id" binding:"required"`
	SessionID            *int   `json:"session_id"`
	MessageType          string `json:"message_type" binding:"required"`
	Content              string `json:"content" binding:"required"`
	AudioDurationSeconds int    `json:"audio_duration_seconds"`
}

type CreatePromptRequest struct {
	UserID      int     `json:"user_id" binding:"required"`
	Title       string  `json:"title" binding:"required"`
	Description *string `json:"description"`
	Content     string  `json:"content" binding:"required"`
	Category    *string `json:"category"`
	VoiceGender *string `json:"voice_gender"`
}

type CreateSubscriptionRequest struct {
	UserID    int     `json:"user_id" binding:"required"`
	PlanID    int     `json:"plan_id" binding:"required"`
	PaymentID *string `json:"payment_id"`
}

type AddTokensRequest struct {
	UserID      int `json:"user_id" binding:"required"`
	TokensToAdd int `json:"tokens_to_add" binding:"required"`
}

type CreatePlanRequest struct {
	Name        string   `json:"name" binding:"required"`
	Description *string  `json:"description"`
	Price       float64  `json:"price" binding:"required"`
	Currency    string   `json:"currency"`
	TokenAmount int      `json:"token_amount" binding:"required"`
	Features    []string `json:"features"`
	IsActive    bool     `json:"is_active"`
}

type UpdatePlanRequest struct {
	PlanID      int      `json:"plan_id" binding:"required"`
	Name        string   `json:"name" binding:"required"`
	Description *string  `json:"description"`
	Price       float64  `json:"price" binding:"required"`
	Currency    string   `json:"currency" binding:"required"`
	TokenAmount int      `json:"token_amount" binding:"required"`
	Features    []string `json:"features"`
	IsActive    bool     `json:"is_active"`
}

type SelectPromptRequest struct {
	UserID   int `json:"user_id" binding:"required"`
	PromptID int `json:"prompt_id" binding:"required"`
}

type SelectVoiceRequest struct {
	UserID int    `json:"user_id" binding:"required"`
	Voice  string `json:"voice" binding:"required"`
}

type LogActivityRequest struct {
	UserID    *int                   `json:"user_id"`
	Action    string                 `json:"action" binding:"required"`
	Metadata  map[string]interface{} `json:"metadata"`
	IPAddress *string                `json:"ip_address"`
	UserAgent *string                `json:"user_agent"`
}

type CreateVoiceSessionRequest struct {
	UserID                *int     `json:"user_id"`
	WordsSpoken           int      `json:"words_spoken"`
	AIResponses           int      `json:"ai_responses"`
	SessionQuality        *float64 `json:"session_quality"`
	ContextSummary        *string  `json:"context_summary"`
	LastConversationTopic *string  `json:"last_conversation_topic"`
}

// API Response structures

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

type UserResponse struct {
	User                  *User   `json:"user"`
	HasActiveSubscription bool    `json:"has_active_subscription"`
	CurrentPlanName       *string `json:"current_plan_name"`
}

type TokenBalanceResponse struct {
	TokenBalance int `json:"token_balance"`
}

type TokenUsageResponse struct {
	TokensUsed      int              `json:"tokens_used"`
	NewBalance      int              `json:"new_balance"`
	UsageBreakdown  *UsageBreakdown  `json:"usage_breakdown,omitempty"`
}

type UsageBreakdown struct {
	Input  TokenBreakdown `json:"input"`
	Output TokenBreakdown `json:"output"`
	Total  int            `json:"total"`
}

type TokenBreakdown struct {
	Total  int `json:"total"`
	Text   int `json:"text"`
	Audio  int `json:"audio"`
	Image  int `json:"image"`
	Cached int `json:"cached"`
}

type PromptsResponse struct {
	UserPlan      PlanLevel      `json:"userPlan"`
	BasePrompts   []VoicePrompt  `json:"basePrompts"`
	UserPrompts   []VoicePrompt  `json:"userPrompts"`
	SelectedPromptID *int        `json:"selectedPromptId"`
	PromptLimits  PromptLimits   `json:"promptLimits"`
}

type PlanLevel struct {
	PlanName  string `json:"plan_name"`
	PlanLevel int    `json:"plan_level"`
}

type PromptLimits struct {
	Current       int  `json:"current"`
	Max           int  `json:"max"`
	CanCreateMore bool `json:"can_create_more"`
}

type UserPlanDetails struct {
	ID              int       `json:"id"`
	PlanName        string    `json:"plan_name"`
	TokenAmount     int       `json:"token_amount"`
	TokensUsed      int       `json:"tokens_used"`
	TokensRemaining int       `json:"tokens_remaining"`
	StartDate       time.Time `json:"start_date"`
	EndDate         *time.Time `json:"end_date,omitempty"`
	Status          string    `json:"status"`
	Features        []string  `json:"features"`
}

type UserPlansResponse struct {
	ActivePlans []UserPlanDetails `json:"active_plans"`
	ClosedPlans []UserPlanDetails `json:"closed_plans"`
}
