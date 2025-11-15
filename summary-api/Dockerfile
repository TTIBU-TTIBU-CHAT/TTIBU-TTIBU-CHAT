# Build stage - 의존성 설치
FROM python:3.11-slim AS builder

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Runtime stage - 실행 환경
FROM python:3.11-slim

WORKDIR /app

# builder stage에서 설치된 패키지 복사
COPY --from=builder /root/.local /root/.local

# 애플리케이션 코드 복사
COPY app/ ./app/

# PATH에 로컬 패키지 경로 추가
ENV PATH=/root/.local/bin:$PATH

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]