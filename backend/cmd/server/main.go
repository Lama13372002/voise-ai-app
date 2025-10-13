package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	"voice-ai-backend/internal/api"
	"voice-ai-backend/internal/config"
	"voice-ai-backend/internal/database"

	log "github.com/sirupsen/logrus"
)

func main() {
	// Initialize logger
	log.SetFormatter(&log.TextFormatter{
		FullTimestamp: true,
		ForceColors:   true,
	})

	log.Info("🚀 Starting Voice AI Backend...")

	// Load configuration
	if err := config.Load(); err != nil {
		log.Fatalf("❌ Failed to load configuration: %v", err)
	}

	log.Infof("✅ Configuration loaded (Environment: %s)", config.AppConfig.Environment)

	// Set log level
	level, err := log.ParseLevel(config.AppConfig.LogLevel)
	if err != nil {
		level = log.InfoLevel
	}
	log.SetLevel(level)

	// Connect to database
	if err := database.Connect(config.AppConfig.DatabaseURL); err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer database.Database.Close()

	// Test database connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := database.Database.Ping(ctx); err != nil {
		log.Fatalf("❌ Failed to ping database: %v", err)
	}

	// Setup router
	router := api.SetupRouter()

	// Setup HTTP server
	server := &http.Server{
		Addr:           ":" + config.AppConfig.Port,
		Handler:        router,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   30 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB
	}

	// Start server in goroutine
	go func() {
		log.Infof("🌐 Server listening on http://0.0.0.0:%s", config.AppConfig.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("⏳ Shutting down server...")

	// Graceful shutdown with 10 second timeout
	ctx, cancel = context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Errorf("❌ Server forced to shutdown: %v", err)
	}

	log.Info("✅ Server stopped gracefully")
}
