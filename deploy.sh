#!/bin/bash

# 🚀 Voice AI Chat - Автоматический деплой на VPS
# Использование: ./deploy.sh

set -e

echo "🚀 Voice AI Chat - Production Deployment"
echo "=========================================="
echo ""

# Проверка что .env файл существует
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "Создайте .env файл из .env.example:"
    echo "cp .env.example .env"
    echo "И заполните OPENAI_API_KEY"
    exit 1
fi

# Проверка что OPENAI_API_KEY установлен
source .env
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-your-openai-api-key-here" ]; then
    echo "❌ OPENAI_API_KEY не установлен в .env файле!"
    exit 1
fi

echo "✅ Конфигурация проверена"
echo ""

# Остановить старые контейнеры
echo "🛑 Останавливаем старые контейнеры..."
docker-compose down

# Собрать и запустить новые контейнеры
echo "🔨 Собираем образы..."
docker-compose build --no-cache

echo "🚀 Запускаем контейнеры..."
docker-compose up -d

# Ждем пока сервисы запустятся
echo "⏳ Ждем запуска сервисов..."
sleep 10

# Проверка что backend запустился
echo "🔍 Проверяем backend..."
if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "✅ Backend работает!"
else
    echo "❌ Backend не отвечает!"
    echo "Логи backend:"
    docker-compose logs backend --tail 50
    exit 1
fi

# Проверка что frontend запустился
echo "🔍 Проверяем frontend..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend работает!"
else
    echo "❌ Frontend не отвечает!"
    echo "Логи frontend:"
    docker-compose logs frontend --tail 50
    exit 1
fi

# Проверка что PostgreSQL работает
echo "🔍 Проверяем PostgreSQL..."
if docker-compose exec -T postgres pg_isready -U voiceai > /dev/null 2>&1; then
    echo "✅ PostgreSQL работает!"
else
    echo "❌ PostgreSQL не отвечает!"
    docker-compose logs postgres --tail 50
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Деплой успешно завершен!"
echo "=========================================="
echo ""
echo "📡 Сервисы:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8080/api"
echo "  Health:    http://localhost:8080/api/health"
echo ""
echo "📊 Полезные команды:"
echo "  Логи всех сервисов:  docker-compose logs -f"
echo "  Логи backend:        docker-compose logs -f backend"
echo "  Логи frontend:       docker-compose logs -f frontend"
echo "  Остановить всё:      docker-compose down"
echo "  Перезапустить:       docker-compose restart"
echo ""
echo "🎉 Приложение готово к использованию!"
