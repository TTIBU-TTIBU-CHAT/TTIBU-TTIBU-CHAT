#!/bin/bash
set -e

echo "=========================================="
echo "Stopping TTIBU Application..."
echo "=========================================="

APP_DIR="/home/ec2-user/ttibu-app"

# Docker Compose 파일이 존재하는지 확인
if [ -f "$APP_DIR/docker-compose.prod.yml" ]; then
    cd "$APP_DIR"

    # 실행 중인 컨테이너 확인
    if docker-compose -f docker-compose.prod.yml ps -q | grep -q .; then
        echo "Stopping existing containers..."
        docker-compose -f docker-compose.prod.yml down
        echo "✓ Containers stopped successfully"
    else
        echo "No running containers found"
    fi
else
    echo "No existing application found (first deployment)"
fi

echo "=========================================="
echo "Application Stop Complete"
echo "=========================================="
