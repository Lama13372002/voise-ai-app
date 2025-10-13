#!/bin/bash

# 🚀 Voice AI Chat - Development Mode
# Запускает Backend + Frontend одновременно

set -e

echo "🚀 Starting Development Environment..."
echo ""

# Проверка что .env файлы существуют
if [ ! -f backend/.env ]; then
    echo "⚠️  backend/.env не найден!"
    echo "Создайте из backend/.env.example"
    exit 1
fi

if [ ! -f frontend/.env.local ]; then
    echo "⚠️  frontend/.env.local не найден!"
    echo "Создайте из frontend/.env.example"
    exit 1
fi

# Функция для остановки процессов при Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Запустить Backend
echo "🔧 Starting Backend (Go)..."
cd backend
make dev &
BACKEND_PID=$!
cd ..

# Подождать 3 секунды чтобы backend запустился
sleep 3

# Запустить Frontend
echo "🎨 Starting Frontend (Next.js)..."
cd frontend
bun dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=========================================="
echo "✅ Development environment is running!"
echo "=========================================="
echo ""
echo "📡 Services:"
echo "  🔧 Backend:  http://localhost:8080/api"
echo "  🎨 Frontend: http://localhost:3000"
echo "  ❤️  Health:   http://localhost:8080/api/health"
echo ""
echo "📝 Logs:"
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "💡 Hot reload enabled - changes apply automatically!"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=========================================="
echo ""

# Ждать пока процессы работают
wait
