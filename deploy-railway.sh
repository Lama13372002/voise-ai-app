#!/bin/bash

# 🚂 Deploy to Railway

set -e

echo "🚂 Deploying to Railway..."
echo ""

# Проверка что на правильной ветке
BRANCH=$(git branch --show-current)
echo "📍 Current branch: $BRANCH"

if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
    echo "⚠️  You're not on main/master branch!"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Проверка что нет uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes!"
    echo ""
    git status -s
    echo ""
    read -p "Commit changes now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Commit message: " COMMIT_MSG
        git add .
        git commit -m "$COMMIT_MSG"
    else
        echo "❌ Deploy cancelled"
        exit 1
    fi
fi

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub..."
git push origin $BRANCH

echo ""
echo "=========================================="
echo "✅ Code pushed to GitHub!"
echo "=========================================="
echo ""
echo "🚂 Railway will automatically deploy from GitHub"
echo ""
echo "📋 Next steps:"
echo "  1. Go to Railway Dashboard: https://railway.app/dashboard"
echo "  2. Check deployment status"
echo "  3. View logs if needed"
echo ""
echo "🎉 Deploy initiated!"
