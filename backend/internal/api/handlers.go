package api

import (
	"fmt"
	"net/http"
	"strconv"
	"voice-ai-backend/internal/config"
	"voice-ai-backend/internal/models"
	"voice-ai-backend/internal/services"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

type Handlers struct {
	userService         *services.UserService
	tokenService        *services.TokenService
	planService         *services.PlanService
	conversationService *services.ConversationService
	promptService       *services.PromptService
	openaiService       *services.OpenAIService
	adminService        *services.AdminService
	activityService     *services.ActivityService
	sessionService      *services.SessionService
}

func NewHandlers() *Handlers {
	return &Handlers{
		userService:         services.NewUserService(),
		tokenService:        services.NewTokenService(),
		planService:         services.NewPlanService(),
		conversationService: services.NewConversationService(),
		promptService:       services.NewPromptService(),
		openaiService:       services.NewOpenAIService(),
		adminService:        services.NewAdminService(),
		activityService:     services.NewActivityService(),
		sessionService:      services.NewSessionService(),
	}
}

// User Handlers

func (h *Handlers) CreateOrUpdateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	userResp, err := h.userService.CreateOrUpdateUser(c.Request.Context(), &req, config.AppConfig.DefaultTokenBalance)
	if err != nil {
		log.Errorf("Failed to create/update user: %v", err)
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to create/update user",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    userResp,
	})
}

func (h *Handlers) GetUser(c *gin.Context) {
	telegramID := c.Query("telegram_id")
	userIDStr := c.Query("user_id")

	if telegramID == "" && userIDStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "telegram_id or user_id is required",
		})
		return
	}

	var userResp *models.UserResponse
	var err error

	if telegramID != "" {
		userResp, err = h.userService.GetUserByTelegramID(c.Request.Context(), telegramID)
	} else {
		userID, _ := strconv.Atoi(userIDStr)
		userResp, err = h.userService.GetUserByID(c.Request.Context(), userID)
	}

	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    userResp,
	})
}

func (h *Handlers) UpdateUserModel(c *gin.Context) {
	var req models.UpdateUserModelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	if err := h.userService.UpdateSelectedModel(c.Request.Context(), req.UserID, req.SelectedModel); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"selected_model": req.SelectedModel,
		},
	})
}

// Token Handlers

func (h *Handlers) GetTokenBalance(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "user_id is required",
		})
		return
	}

	userID, _ := strconv.Atoi(userIDStr)
	balance, err := h.tokenService.GetTokenBalance(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: models.TokenBalanceResponse{
			TokenBalance: balance,
		},
	})
}

func (h *Handlers) DeductTokens(c *gin.Context) {
	var req models.TokenUsageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	result, err := h.tokenService.DeductTokens(c.Request.Context(), &req)
	if err != nil {
		if err.Error() == "insufficient tokens" {
			c.JSON(http.StatusPaymentRequired, models.APIResponse{
				Success: false,
				Error:   "Insufficient tokens",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.APIResponse{
				Success: false,
				Error:   err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    result,
	})
}

func (h *Handlers) AddTokens(c *gin.Context) {
	var req models.AddTokensRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	newBalance, err := h.tokenService.AddTokens(c.Request.Context(), req.UserID, req.TokensToAdd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"tokens_added": req.TokensToAdd,
			"new_balance":  newBalance,
		},
	})
}

// Plan Handlers

func (h *Handlers) GetPlans(c *gin.Context) {
	plans, err := h.planService.GetAllPlans(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to get plans",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"plans": plans,
		},
	})
}

func (h *Handlers) GetUserPlans(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "user_id is required",
		})
		return
	}

	userID, _ := strconv.Atoi(userIDStr)
	userPlans, err := h.planService.GetUserPlans(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to get user plans",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    userPlans,
	})
}

func (h *Handlers) CreateSubscription(c *gin.Context) {
	var req models.CreateSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	subscriptionID, newBalance, err := h.planService.CreateSubscription(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to create subscription",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"subscription_id":   subscriptionID,
			"new_token_balance": newBalance,
			"message":           fmt.Sprintf("Subscription activated. Token balance set to %d", newBalance),
		},
	})
}

// Conversation Handlers

func (h *Handlers) GetConversation(c *gin.Context) {
	userIDStr := c.Query("user_id")
	limitStr := c.DefaultQuery("limit", "6")

	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "user_id is required",
		})
		return
	}

	userID, _ := strconv.Atoi(userIDStr)
	limit, _ := strconv.Atoi(limitStr)

	messages, err := h.conversationService.GetUserConversation(c.Request.Context(), userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to get conversation",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"messages": messages,
		},
	})
}

func (h *Handlers) SaveMessage(c *gin.Context) {
	var req models.SaveConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	messageID, err := h.conversationService.SaveMessage(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to save message",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"message_id": messageID,
		},
	})
}

// Prompt Handlers

func (h *Handlers) GetPrompts(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "user_id is required",
		})
		return
	}

	userID, _ := strconv.Atoi(userIDStr)
	prompts, err := h.promptService.GetUserPrompts(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to get prompts",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    prompts,
	})
}

func (h *Handlers) CreatePrompt(c *gin.Context) {
	var req models.CreatePromptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	prompt, err := h.promptService.CreatePrompt(c.Request.Context(), &req)
	if err != nil {
		if err.Error() == "prompt limit reached" {
			c.JSON(http.StatusForbidden, models.APIResponse{
				Success: false,
				Error:   "Prompt limit reached for your plan",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.APIResponse{
				Success: false,
				Error:   "Failed to create prompt",
			})
		}
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"prompt": prompt,
		},
	})
}

// OpenAI Handler

func (h *Handlers) GetOpenAIToken(c *gin.Context) {
	userIDStr := c.Query("user_id")

	var userID *int
	if userIDStr != "" {
		id, _ := strconv.Atoi(userIDStr)
		userID = &id
	}

	token, err := h.openaiService.GetEphemeralToken(c.Request.Context(), userID)
	if err != nil {
		log.Errorf("Failed to get OpenAI token: %v", err)
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to get OpenAI token",
		})
		return
	}

	c.JSON(http.StatusOK, token)
}

// Health check
func (h *Handlers) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"service": "voice-ai-backend",
	})
}

// Admin Handlers

func (h *Handlers) GetAllPlansForAdmin(c *gin.Context) {
	plans, err := h.adminService.GetAllPlansForAdmin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to get plans",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"plans": plans,
		},
	})
}

func (h *Handlers) CreatePlanAdmin(c *gin.Context) {
	var req models.CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	// Установка дефолтных значений
	if req.Currency == "" {
		req.Currency = "USD"
	}
	if req.Features == nil {
		req.Features = []string{}
	}

	plan, err := h.adminService.CreatePlan(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to create plan",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"plan": plan,
		},
	})
}

func (h *Handlers) UpdatePlanAdmin(c *gin.Context) {
	var req models.UpdatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	plan, err := h.adminService.UpdatePlan(c.Request.Context(), &req)
	if err != nil {
		if err.Error() == "plan not found" {
			c.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Error:   "Plan not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.APIResponse{
				Success: false,
				Error:   "Failed to update plan",
			})
		}
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"plan": plan,
		},
	})
}

func (h *Handlers) DeletePlanAdmin(c *gin.Context) {
	planIDStr := c.Query("plan_id")
	if planIDStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "plan_id parameter is required",
		})
		return
	}

	planID, _ := strconv.Atoi(planIDStr)

	err := h.adminService.DeletePlan(c.Request.Context(), planID)
	if err != nil {
		if err.Error() == "plan not found" {
			c.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Error:   "Plan not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.APIResponse{
				Success: false,
				Error:   "Failed to delete plan",
			})
		}
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Plan successfully deleted",
	})
}

// User Current Plan Handler

func (h *Handlers) GetCurrentUserPlan(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "user_id is required",
		})
		return
	}

	userID, _ := strconv.Atoi(userIDStr)

	currentPlan, err := h.planService.GetCurrentUserPlan(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, currentPlan)
}

// User Prompt Handlers

func (h *Handlers) SelectPrompt(c *gin.Context) {
	var req models.SelectPromptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	err := h.promptService.SelectPrompt(c.Request.Context(), req.UserID, req.PromptID)
	if err != nil {
		if err.Error() == "prompt not found or not accessible" {
			c.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Error:   "Prompt not found or not accessible",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.APIResponse{
				Success: false,
				Error:   "Failed to select prompt",
			})
		}
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Prompt successfully selected",
	})
}

func (h *Handlers) DeletePrompt(c *gin.Context) {
	userIDStr := c.Query("user_id")
	promptIDStr := c.Query("prompt_id")

	if userIDStr == "" || promptIDStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "user_id and prompt_id are required",
		})
		return
	}

	userID, _ := strconv.Atoi(userIDStr)
	promptID, _ := strconv.Atoi(promptIDStr)

	wasSelected, err := h.promptService.DeletePrompt(c.Request.Context(), userID, promptID)
	if err != nil {
		if err.Error() == "prompt not found or cannot be deleted" {
			c.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Error:   "Prompt not found or cannot be deleted",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.APIResponse{
				Success: false,
				Error:   "Failed to delete prompt",
			})
		}
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Prompt successfully deleted",
		Data: map[string]interface{}{
			"was_selected": wasSelected,
		},
	})
}

// User Voice Handlers

func (h *Handlers) GetUserVoice(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "user_id is required",
		})
		return
	}

	userID, _ := strconv.Atoi(userIDStr)

	voice, err := h.userService.GetSelectedVoice(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"voice": voice,
		},
	})
}

func (h *Handlers) UpdateUserVoice(c *gin.Context) {
	var req models.SelectVoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	err := h.userService.UpdateSelectedVoice(c.Request.Context(), req.UserID, req.Voice)
	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Error:   "User not found",
			})
		} else {
			c.JSON(http.StatusBadRequest, models.APIResponse{
				Success: false,
				Error:   err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Voice successfully updated",
		Data: map[string]interface{}{
			"voice": req.Voice,
		},
	})
}

// Activity Handlers

func (h *Handlers) LogActivity(c *gin.Context) {
	var req models.LogActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	activityID, err := h.activityService.LogActivity(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to log activity",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"activity_id": activityID,
		},
	})
}

func (h *Handlers) GetUserActivities(c *gin.Context) {
	userIDStr := c.Query("user_id")
	limitStr := c.DefaultQuery("limit", "50")

	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "user_id is required",
		})
		return
	}

	userID, _ := strconv.Atoi(userIDStr)
	limit, _ := strconv.Atoi(limitStr)

	activities, err := h.activityService.GetUserActivities(c.Request.Context(), userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to get activities",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"activities": activities,
		},
	})
}

// Voice Session Handlers

func (h *Handlers) CreateVoiceSession(c *gin.Context) {
	var req models.CreateVoiceSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Invalid request: " + err.Error(),
		})
		return
	}

	sessionID, err := h.sessionService.CreateVoiceSession(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to create session",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"session_id": sessionID,
		},
	})
}

func (h *Handlers) GetUserVoiceSessions(c *gin.Context) {
	userIDStr := c.Query("user_id")
	limitStr := c.DefaultQuery("limit", "20")

	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "user_id is required",
		})
		return
	}

	userID, _ := strconv.Atoi(userIDStr)
	limit, _ := strconv.Atoi(limitStr)

	sessions, err := h.sessionService.GetUserVoiceSessions(c.Request.Context(), userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to get sessions",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"sessions": sessions,
		},
	})
}

func (h *Handlers) GetSessionStats(c *gin.Context) {
	userIDStr := c.Query("user_id")

	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "user_id is required",
		})
		return
	}

	userID, _ := strconv.Atoi(userIDStr)

	stats, err := h.sessionService.GetSessionStats(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to get stats",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: stats,
	})
}
