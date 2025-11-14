# Build stage - 의존성 설치
FROM python:3.11-slim AS builder

WORKDIR /app

# 시스템 기본 의존성 (git 필요)
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# 실행에 필요한 기본 패키지
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# builder에서 설치한 site-packages 복사
COPY --from=builder /usr/local /usr/local

# 애플리케이션 코드 복사
COPY . .

# HuggingFace 캐시 경로 설정 (도커 내부에 캐시)
ENV HF_HOME=/app/.cache/huggingface

# 포트 노출
EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
