#!/bin/bash

set -e

echo "🚀 Voice AI Backend Setup Script"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Go installation
echo -n "Checking Go installation... "
if ! command -v go &> /dev/null; then
    echo -e "${RED}FAILED${NC}"
    echo "Go is not installed. Please install Go 1.22+ from https://golang.org/dl/"
    exit 1
fi

GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
echo -e "${GREEN}OK${NC} (version $GO_VERSION)"

# Check PostgreSQL connection
echo -n "Checking PostgreSQL... "
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}WARNING${NC}"
    echo "PostgreSQL client not found. Make sure PostgreSQL server is running."
else
    echo -e "${GREEN}OK${NC}"
fi

# Create .env if not exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo -e "${GREEN}✓${NC} .env file created from .env.example"
    echo -e "${YELLOW}⚠${NC}  Please edit .env file and set your DATABASE_URL and OPENAI_API_KEY"
    echo ""
    read -p "Press Enter to continue after editing .env file..."
else
    echo -e "${GREEN}✓${NC} .env file already exists"
fi

# Install dependencies
echo ""
echo "📦 Installing Go dependencies..."
go mod download
go mod tidy
echo -e "${GREEN}✓${NC} Dependencies installed"

# Build the application
echo ""
echo "🔨 Building application..."
mkdir -p bin
go build -o bin/voice-ai-server cmd/server/main.go
echo -e "${GREEN}✓${NC} Build successful: bin/voice-ai-server"

# Test database connection
echo ""
echo "🗄️  Testing database connection..."
if [ -f .env ]; then
    source .env
    if [ -n "$DATABASE_URL" ]; then
        # Extract connection details from DATABASE_URL
        # This is a simple check, for production use proper parsing
        if [[ $DATABASE_URL == postgresql://* ]]; then
            echo -e "${GREEN}✓${NC} DATABASE_URL is set"
        else
            echo -e "${YELLOW}⚠${NC}  DATABASE_URL format might be incorrect"
        fi
    else
        echo -e "${RED}✗${NC} DATABASE_URL is not set in .env"
    fi
fi

# Check OpenAI API key
echo ""
echo "🤖 Checking OpenAI API configuration..."
if [ -f .env ]; then
    source .env
    if [ -n "$OPENAI_API_KEY" ]; then
        echo -e "${GREEN}✓${NC} OPENAI_API_KEY is set"
    else
        echo -e "${RED}✗${NC} OPENAI_API_KEY is not set in .env"
    fi
fi

echo ""
echo "================================="
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file if you haven't already:"
echo "   nano .env"
echo ""
echo "2. Start the server:"
echo "   make dev    # Development mode"
echo "   make run    # Production mode"
echo ""
echo "3. Test the API:"
echo "   curl http://localhost:8080/api/health"
echo ""
echo "================================="
