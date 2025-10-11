#!/bin/bash

# Docker Start Script for Kishkwambi Backend
# This script sets up and starts the backend server in Docker

set -e

echo "🚀 Starting Kishkwambi Backend Docker Setup"
echo "=========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please create a .env file with required environment variables."
    echo "   See DOCKER_README.md for details."
    exit 1
fi

echo "✅ .env file found"

# Create arrivedContainers directory if it doesn't exist
if [ ! -d "arrivedContainers" ]; then
    echo "📁 Creating arrivedContainers directory..."
    mkdir -p arrivedContainers
fi

# Set permissions to allow read/write
echo "🔒 Setting permissions for arrivedContainers..."
chmod 777 arrivedContainers

echo "✅ Directory setup complete"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "   Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"

# Build and start with docker-compose
if [ -f "docker-compose.yml" ]; then
    echo "🏗️  Building and starting containers with docker-compose..."
    docker-compose up -d --build
    
    echo ""
    echo "⏳ Waiting for server to be ready..."
    sleep 5
    
    # Check health
    echo "🏥 Checking server health..."
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ Server is healthy and running!"
        echo ""
        echo "📊 Server Information:"
        echo "   - Health Check: http://localhost:3000/health"
        echo "   - API Base URL: http://localhost:3000"
        echo ""
        echo "📝 View logs with: docker-compose logs -f"
        echo "🛑 Stop server with: docker-compose down"
    else
        echo "⚠️  Server started but health check failed"
        echo "   Check logs with: docker-compose logs"
    fi
else
    echo "❌ Error: docker-compose.yml not found!"
    exit 1
fi

echo ""
echo "=========================================="
echo "✨ Setup complete!"

