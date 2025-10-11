#!/bin/bash

# Docker Logs Script for Kishkwambi Backend

echo "📋 Showing Kishkwambi Backend Logs..."
echo "====================================="
echo "Press Ctrl+C to exit"
echo ""

if [ -f "docker-compose.yml" ]; then
    docker-compose logs -f
else
    docker logs -f kishkwambi-backend
fi

