.PHONY: help build run dev clean test lint install

help: ## Show help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	go mod download
	go mod tidy
	@echo "✅ Dependencies installed"

build: ## Build the application
	@echo "🔨 Building application..."
	go build -o bin/voice-ai-server cmd/server/main.go
	@echo "✅ Build complete: bin/voice-ai-server"

run: build ## Build and run the application
	@echo "🚀 Starting server..."
	./bin/voice-ai-server

dev: ## Run in development mode with hot reload
	@echo "🔥 Starting development server..."
	go run cmd/server/main.go

clean: ## Clean build artifacts
	@echo "🧹 Cleaning..."
	rm -rf bin/
	go clean
	@echo "✅ Clean complete"

test: ## Run tests
	@echo "🧪 Running tests..."
	go test -v -race -coverprofile=coverage.out ./...
	@echo "✅ Tests complete"

lint: ## Run linter
	@echo "🔍 Running linter..."
	go fmt ./...
	go vet ./...
	@echo "✅ Lint complete"

docker-build: ## Build Docker image
	@echo "🐳 Building Docker image..."
	docker build -t voice-ai-backend:latest .
	@echo "✅ Docker image built"

docker-run: ## Run Docker container
	@echo "🐳 Running Docker container..."
	docker run -p 8080:8080 --env-file .env voice-ai-backend:latest

migrate-up: ## Run database migrations (placeholder)
	@echo "⬆️  Running migrations..."
	@echo "ℹ️  Add your migration tool command here"

migrate-down: ## Rollback database migrations (placeholder)
	@echo "⬇️  Rolling back migrations..."
	@echo "ℹ️  Add your migration tool command here"

.DEFAULT_GOAL := help
