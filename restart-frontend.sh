#!/bin/bash

# 🔄 Перезапуск Frontend (Next.js)

set -e

echo "🔄 Restarting Frontend..."

# Найти и убить процесс Next.js
echo "🛑 Stopping old frontend process..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "bun.*dev" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# Запустить новый
echo "🚀 Starting new frontend process..."
cd frontend
bun dev &

echo ""
echo "✅ Frontend restarted!"
echo "📡 Running at: http://localhost:3000"
echo ""
echo "💡 Check logs above for any errors"
