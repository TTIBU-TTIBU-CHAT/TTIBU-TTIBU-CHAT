# app/main.py
# ----------------------------------------------------
# FastAPI 엔트리포인트
# - /summarize : 요약 + 키워드
# - /title-summarize : 제목 생성
# ----------------------------------------------------

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time

from app.models import (
    TextRequest,
    SummaryKeywordResponse,
    TitleRequest,
    TitleResponse,
)
from app.services import (
    generate_summary,
    extract_keywords,
    generate_title,
)

app = FastAPI(
    title="Summary & Keyword API (v4)",
    description="Qwen2.5-1.5B + KRWordRank + KeyBERT 기반 한국어 요약/키워드/제목 생성 API",
    version="4.0.0",
)

# CORS 설정 (필요 시 origin 제한 가능)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------------------------------
# 헬스 체크
# ----------------------------------------------------
@app.get("/")
async def root():
    return {"message": "Summary API v4 is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ----------------------------------------------------
# 본문 요약 + 키워드 추출
# ----------------------------------------------------
@app.post("/summarize", response_model=SummaryKeywordResponse)
async def summarize(request: TextRequest):
    start = time.time()

    summary = generate_summary(request.text, request.maxLength, request.minLength)
    keywords = extract_keywords(request.text)

    elapsed_ms = int((time.time() - start) * 1000)

    return SummaryKeywordResponse(
        summary=summary,
        keywords=keywords,
        processingTimeMs=elapsed_ms,
    )


# ----------------------------------------------------
# 제목 생성
# ----------------------------------------------------
@app.post("/title-summarize", response_model=TitleResponse)
async def title_summarize(request: TitleRequest):
    start = time.time()

    title = generate_title(request.text, request.maxLength, request.minLength)

    elapsed_ms = int((time.time() - start) * 1000)

    return TitleResponse(
        title=title,
        processingTimeMs=elapsed_ms,
    )


# ----------------------------------------------------
# 로컬 실행용
# ----------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
