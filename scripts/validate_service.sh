#!/bin/bash
set -e

echo "=========================================="
echo "Validating Service Health..."
echo "=========================================="

APP_DIR="/home/ubuntu/ttibu-app"
cd "$APP_DIR"

# 최대 대기 시간 (초)
MAX_WAIT=600
ELAPSED=0
CHECK_INTERVAL=10

# Frontend 헬스체크
echo "Checking Frontend health..."
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -f http://localhost:80 > /dev/null 2>&1; then
        echo "✓ Frontend is healthy"
        break
    fi
    echo "Waiting for Frontend to be ready... ($ELAPSED/$MAX_WAIT seconds)"
    sleep $CHECK_INTERVAL
    ELAPSED=$((ELAPSED + CHECK_INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "✗ Frontend health check failed"
    docker-compose -f docker-compose.prod.yml logs frontend
    exit 1
fi

# Core API 헬스체크
echo "Checking Core API health..."
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
        echo "✓ Core API is healthy"
        break
    fi
    echo "Waiting for Core API to be ready... ($ELAPSED/$MAX_WAIT seconds)"
    sleep $CHECK_INTERVAL
    ELAPSED=$((ELAPSED + CHECK_INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "✗ Core API health check failed"
    docker-compose -f docker-compose.prod.yml logs core-api
    exit 1
fi

# Summary API 헬스체크
echo "Checking Summary API health..."
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -f http://localhost:8001/health > /dev/null 2>&1; then
        echo "✓ Summary API is healthy"
        break
    fi
    echo "Waiting for Summary API to be ready... ($ELAPSED/$MAX_WAIT seconds)"
    sleep $CHECK_INTERVAL
    ELAPSED=$((ELAPSED + CHECK_INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "✗ Summary API health check failed"
    docker-compose -f docker-compose.prod.yml logs summary-api
    exit 1
fi

# 최종 상태 출력
echo ""
echo "All Services Health Check:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=========================================="
echo "Service Validation Complete - All Healthy!"
echo "=========================================="
