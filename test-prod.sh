#!/bin/bash

# 🧪 Тестирование в Production режиме (Docker)

set -e

echo "🧪 Testing in Production Mode (Docker)..."
echo ""

# Проверка .env
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Create from .env.example and set OPENAI_API_KEY"
    exit 1
fi

# Остановить локальные процессы разработки
echo "🛑 Stopping development processes..."
./stop-all.sh 2>/dev/null || true

# Остановить старые контейнеры
echo "🧹 Cleaning up old containers..."
docker-compose down -v

# Собрать и запустить
echo "🔨 Building Docker images..."
docker-compose build --no-cache

echo "🚀 Starting containers..."
docker-compose up -d

# Ждем запуска
echo "⏳ Waiting for services to start..."
sleep 10

# Проверка Backend
echo ""
echo "🔍 Checking Backend..."
if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "✅ Backend is running!"
    curl http://localhost:8080/api/health
else
    echo "❌ Backend is NOT responding!"
    echo "Logs:"
    docker-compose logs backend --tail 50
    exit 1
fi

# Проверка Frontend
echo ""
echo "🔍 Checking Frontend..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running!"
else
    echo "❌ Frontend is NOT responding!"
    echo "Logs:"
    docker-compose logs frontend --tail 50
    exit 1
fi

# Проверка PostgreSQL
echo ""
echo "🔍 Checking PostgreSQL..."
if docker-compose exec -T postgres pg_isready -U voiceai > /dev/null 2>&1; then
    echo "✅ PostgreSQL is running!"
else
    echo "❌ PostgreSQL is NOT responding!"
    docker-compose logs postgres --tail 50
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Production test PASSED!"
echo "=========================================="
echo ""
echo "📡 Services:"
echo "  Backend:  http://localhost:8080/api"
echo "  Frontend: http://localhost:3000"
echo "  Health:   http://localhost:8080/api/health"
echo ""
echo "📊 Useful commands:"
echo "  View logs:       docker-compose logs -f"
echo "  Stop services:   docker-compose down"
echo "  Restart:         docker-compose restart"
echo ""
echo "🎉 Ready for Railway deployment!"
