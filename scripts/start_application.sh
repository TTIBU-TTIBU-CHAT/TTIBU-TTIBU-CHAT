#!/bin/bash
set -e

echo "=========================================="
echo "Starting TTIBU Application..."
echo "=========================================="

APP_DIR="/home/ec2-user/ttibu-app"

# 애플리케이션 디렉토리로 이동
cd "$APP_DIR"

# .env 파일 복원 (백업이 있는 경우)
if [ -f "/home/ec2-user/.env.backup" ] && [ ! -f ".env" ]; then
    echo "Restoring .env file from backup..."
    cp "/home/ec2-user/.env.backup" ".env"
fi

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo "⚠ WARNING: .env file not found!"
    echo "Please create .env file with required environment variables"
    exit 1
fi

# ECR 이미지 pull
echo "Pulling latest images from ECR..."
docker-compose -f docker-compose.prod.yml pull
echo "✓ Images pulled successfully"

# 컨테이너 시작
echo "Starting containers..."
docker-compose -f docker-compose.prod.yml up -d
echo "✓ Containers started successfully"

# 컨테이너 상태 확인
echo ""
echo "Container Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=========================================="
echo "Application Start Complete"
echo "=========================================="
