package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	Port        string
	Environment string
	FrontendURL string

	// Database
	DatabaseURL string

	// OpenAI
	OpenAIAPIKey       string
	OpenAIRealtimeURL  string

	// CORS
	AllowedOrigins []string

	// Token
	DefaultTokenBalance int
	MinTokenThreshold   int

	// Logging
	LogLevel string
}

var AppConfig *Config

func Load() error {
	// Загружаем .env файл (игнорируем ошибку если файла нет)
	_ = godotenv.Load()

	AppConfig = &Config{
		Port:                getEnv("PORT", "8080"),
		Environment:         getEnv("ENVIRONMENT", "production"),
		FrontendURL:         getEnv("FRONTEND_URL", "http://localhost:3000"),
		DatabaseURL:         getEnv("DATABASE_URL", ""),
		OpenAIAPIKey:        getEnv("OPENAI_API_KEY", ""),
		OpenAIRealtimeURL:   getEnv("OPENAI_REALTIME_URL", "https://api.openai.com/v1/realtime/client_secrets"),
		AllowedOrigins:      strings.Split(getEnv("ALLOWED_ORIGINS", "http://localhost:3000"), ","),
		DefaultTokenBalance: getEnvAsInt("DEFAULT_TOKEN_BALANCE", 1000),
		MinTokenThreshold:   getEnvAsInt("MIN_TOKEN_THRESHOLD", 2000),
		LogLevel:            getEnv("LOG_LEVEL", "info"),
	}

	// Валидация критичных параметров
	if AppConfig.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}

	if AppConfig.OpenAIAPIKey == "" {
		return fmt.Errorf("OPENAI_API_KEY is required")
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}
