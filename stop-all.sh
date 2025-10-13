#!/bin/bash

# 🛑 Остановка ВСЕХ процессов разработки

echo "🛑 Stopping all development processes..."

# Остановить Backend
echo "  Stopping Backend..."
pkill -f "go run cmd/server/main.go" 2>/dev/null || true
pkill -f "voice-ai-server" 2>/dev/null || true
pkill -f "air" 2>/dev/null || true

# Остановить Frontend
echo "  Stopping Frontend..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "bun.*dev" 2>/dev/null || true

# Освободить порты
echo "  Freeing ports..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

sleep 1

echo ""
echo "✅ All processes stopped!"
echo ""
