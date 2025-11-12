from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import torch
import os
import time

# 내부 모듈 import
from models import TextRequest, SummaryKeywordResponse, TitleRequest, TitleResponse
from services import generate_summary, extract_keywords, generate_title

# ----------------------------------------------------
# ⚙️ PyTorch 스레드 설정
# ----------------------------------------------------
NUM_THREADS = int(os.getenv("NUM_THREADS", "2"))
torch.set_num_threads(NUM_THREADS)
torch.set_num_interop_threads(NUM_THREADS)
print(f"PyTorch using {NUM_THREADS} CPU threads")

# ----------------------------------------------------
# 🚀 FastAPI 앱 초기화
# ----------------------------------------------------
app = FastAPI(
    title="Summary & Keyword API",
    description="한국어 텍스트 요약 / 키워드 / 제목 생성 API (개선 버전)",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# ✅ 기본 페이지 & 헬스체크
# ----------------------------------------------------
@app.get("/")
async def root():
    return {"message": "Summary API v3 is running"}

@app.get("/health", summary="서버 상태 체크")
async def health_check():
    return {"status": "healthy"}

# ----------------------------------------------------
# 🧠 본문 요약 + 키워드 추출
# ----------------------------------------------------
@app.post("/summarize", response_model=SummaryKeywordResponse, summary="본문 요약 및 핵심 키워드 생성")
async def summarize_api(request: TextRequest):
    start_time = time.time()

    summary_text = generate_summary(request.text, request.maxLength, request.minLength)
    keywords_list = extract_keywords(request.text)

    processing_time = (time.time() - start_time) * 1000
    return SummaryKeywordResponse(
        summary=summary_text,
        keywords=keywords_list,
        processingTimeMs=int(processing_time)
    )

# ----------------------------------------------------
# 📰 제목형 요약 생성
# ----------------------------------------------------
@app.post("/title-summarize", response_model=TitleResponse, summary="본문 기반 제목 생성 (요약 + 키워드 융합)")
async def title_summarize_api(request: TitleRequest):
    start_time = time.time()
    title_text = generate_title(request.text, request.maxLength, request.minLength)
    processing_time = (time.time() - start_time) * 1000

    return TitleResponse(
        title=title_text,
        processingTimeMs=int(processing_time)
    )

# ----------------------------------------------------
# 🏁 실행
# ----------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
