package api

import (
	"voice-ai-backend/internal/config"
	"voice-ai-backend/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	if config.AppConfig.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Middleware
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())

	// CORS configuration
	corsConfig := cors.Config{
		AllowOrigins:     config.AppConfig.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}
	router.Use(cors.New(corsConfig))

	// Initialize handlers
	handlers := NewHandlers()

	// API routes
	api := router.Group("/api")
	{
		// Health check
		api.GET("/health", handlers.HealthCheck)

		// Users
		api.POST("/users", handlers.CreateOrUpdateUser)
		api.GET("/users", handlers.GetUser)
		api.PATCH("/users", handlers.UpdateUserModel)

		// Tokens
		api.GET("/tokens", handlers.GetTokenBalance)
		api.PATCH("/tokens", handlers.DeductTokens)
		api.PUT("/tokens", handlers.AddTokens)

		// Plans
		api.GET("/plans", handlers.GetPlans)
		api.GET("/user-plans", handlers.GetUserPlans)
		api.POST("/user-plans", handlers.CreateSubscription)

		// Conversation
		api.GET("/conversation", handlers.GetConversation)
		api.POST("/conversation", handlers.SaveMessage)

		// Prompts
		api.GET("/prompts", handlers.GetPrompts)
		api.POST("/prompts", handlers.CreatePrompt)

		// OpenAI Token
		api.GET("/token", handlers.GetOpenAIToken)

		// Admin - Plans management
		admin := api.Group("/admin")
		{
			admin.GET("/plans", handlers.GetAllPlansForAdmin)
			admin.POST("/plans", handlers.CreatePlanAdmin)
			admin.PUT("/plans", handlers.UpdatePlanAdmin)
			admin.DELETE("/plans", handlers.DeletePlanAdmin)
		}

		// User Current Plan
		api.GET("/user-current-plan", handlers.GetCurrentUserPlan)

		// User Prompt selection/deletion
		api.POST("/user-prompt", handlers.SelectPrompt)
		api.DELETE("/user-prompt", handlers.DeletePrompt)

		// User Voice selection
		api.GET("/user-voice", handlers.GetUserVoice)
		api.POST("/user-voice", handlers.UpdateUserVoice)

		// User Activity
		api.POST("/user-activity", handlers.LogActivity)
		api.GET("/user-activity", handlers.GetUserActivities)

		// Voice Sessions
		api.POST("/voice-sessions", handlers.CreateVoiceSession)
		api.GET("/voice-sessions", handlers.GetUserVoiceSessions)
		api.GET("/voice-sessions/stats", handlers.GetSessionStats)
	}

	return router
}
