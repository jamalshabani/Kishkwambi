#!/bin/bash

# Docker Stop Script for Kishkwambi Backend

set -e

echo "🛑 Stopping Kishkwambi Backend..."
echo "================================"

if [ -f "docker-compose.yml" ]; then
    docker-compose down
    echo "✅ Server stopped successfully"
else
    echo "❌ docker-compose.yml not found"
    echo "   Trying to stop container directly..."
    if docker stop kishkwambi-backend 2>/dev/null; then
        docker rm kishkwambi-backend
        echo "✅ Server stopped successfully"
    else
        echo "❌ No running container found"
    fi
fi

echo "================================"

