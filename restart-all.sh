#!/bin/bash

# 🔄 Перезапуск ВСЕГО стека (Backend + Frontend)

set -e

echo "🔄 Restarting ALL services..."
echo ""

# Остановить всё
./stop-all.sh

# Подождать
sleep 2

# Запустить всё заново
./dev.sh
