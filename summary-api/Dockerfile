# Build stage - 의존성 설치 및 모델 다운로드
FROM python:3.11-slim AS builder

WORKDIR /app

# 시스템 의존성 설치 (JDK for KoNLPy)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# HuggingFace 모델 미리 다운로드 (컨테이너 시작 시간 단축)
RUN python -c "\
from transformers import PreTrainedTokenizerFast, BartForConditionalGeneration; \
from sentence_transformers import SentenceTransformer; \
print('Downloading gogamza/kobart-summarization...'); \
PreTrainedTokenizerFast.from_pretrained('gogamza/kobart-summarization'); \
BartForConditionalGeneration.from_pretrained('gogamza/kobart-summarization'); \
print('Downloading heegyu/kobart-title...'); \
PreTrainedTokenizerFast.from_pretrained('heegyu/kobart-title'); \
BartForConditionalGeneration.from_pretrained('heegyu/kobart-title'); \
print('Downloading jhgan/ko-sroberta-multitask...'); \
SentenceTransformer('jhgan/ko-sroberta-multitask'); \
print('All models downloaded successfully!');"

# Runtime stage - 실행 환경
FROM python:3.11-slim

WORKDIR /app

# JDK 설치 (KoNLPy 실행 필수)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

# JAVA_HOME 환경 변수 설정
ENV JAVA_HOME=/usr/lib/jvm/default-java

# builder stage에서 설치된 패키지와 모델 캐시 복사
COPY --from=builder /root/.local /root/.local
COPY --from=builder /root/.cache /root/.cache

# 애플리케이션 코드 복사
COPY app/ ./app/

# PATH에 로컬 패키지 경로 추가
ENV PATH=/root/.local/bin:$PATH

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]