#!/bin/bash

# 🔄 Перезапуск Backend (Go)

set -e

echo "🔄 Restarting Backend..."

# Найти и убить процесс Go сервера
echo "🛑 Stopping old backend process..."
pkill -f "go run cmd/server/main.go" 2>/dev/null || true
pkill -f "voice-ai-server" 2>/dev/null || true
sleep 1

# Запустить новый
echo "🚀 Starting new backend process..."
cd backend
make dev &

echo ""
echo "✅ Backend restarted!"
echo "📡 Running at: http://localhost:8080/api"
echo "❤️  Health check: http://localhost:8080/api/health"
echo ""
echo "💡 Check logs above for any errors"
