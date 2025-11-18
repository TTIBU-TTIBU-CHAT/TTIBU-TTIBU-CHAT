#!/bin/bash
set -e

echo "=========================================="
echo "Preparing Environment..."
echo "=========================================="

APP_DIR="/home/ubuntu/ttibu-app"
S3_BUCKET="${S3_CONFIG_BUCKET}"
LITELLM_CONFIG_PATH="/home/ubuntu/litellm-config.yaml"

# S3에서 litellm-config.yaml 다운로드
if [ -n "$S3_BUCKET" ]; then
    echo "Downloading litellm-config.yaml from S3..."
    aws s3 cp "s3://${S3_BUCKET}/litellm-config.yaml" "$LITELLM_CONFIG_PATH"
    echo "✓ litellm-config.yaml downloaded successfully"
else
    echo "⚠ S3_CONFIG_BUCKET not set, skipping config download"
fi

# ECR Public 로그인
echo "Logging in to Amazon ECR Public..."
aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws
echo "✓ ECR Public login successful"

# 이전 배포 디렉토리 정리 (옵션)
if [ -d "$APP_DIR" ]; then
    echo "Cleaning up old deployment files (keeping .env)..."
    # .env 파일 백업
    if [ -f "$APP_DIR/.env" ]; then
        cp "$APP_DIR/.env" "/home/ubuntu/.env.backup"
    fi
fi

echo "=========================================="
echo "Environment Preparation Complete"
echo "=========================================="
