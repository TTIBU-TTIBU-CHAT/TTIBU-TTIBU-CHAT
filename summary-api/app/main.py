from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import torch
import os
import time

# models.py와 services.py 가져오기
from .models import TextRequest, SummaryKeywordResponse 
from .services import generate_summary, extract_keywords

# CPU 스레드 제한
NUM_THREADS = int(os.getenv('NUM_THREADS', '2')) 
torch.set_num_threads(NUM_THREADS)
torch.set_num_interop_threads(NUM_THREADS)
print(f"PyTorch using {NUM_THREADS} CPU threads")


# --- FastAPI 앱 설정 ---
app = FastAPI(
    title="Summary API",
    description="API for text summarization services",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Summary API is running"}

@app.get("/health", summary="서버 상태 체크")
async def health_check():
    return {"status": "healthy"}


# ----------------------------------------------------
# 1. (text: str) 대신 (request: TextRequest)
# 2. 응답 모델을 response_model=SummaryKeywordResponse로 지정
# ----------------------------------------------------
@app.post("/summarize", response_model=SummaryKeywordResponse, summary="요약 및 키워드 생성")
async def summarize_api(request: TextRequest): # <- Pydantic 모델 사용
    """
    메인 API: 텍스트를 받아 요약과 키워드 생성
    """
    start_time = time.time() # 시작 시간 측정

    # 4. services.py에 있던 실제 로직 호출
    summary_text = generate_summary(
        request.text,
        request.maxLength,
        request.minLength
    )
    
    keywords_list = extract_keywords(request.text)

    # 걸린 시간 계산
    processing_time = (time.time() - start_time) * 1000

    # 5. SummaryKeywordResponse 모델 형식으로 최종 결과 반환
    return SummaryKeywordResponse(
        summary=summary_text,
        keywords=keywords_list,
        processingTimeMs=int(processing_time)
    )

# 포트를 8001로 변경 (core-api와 충돌 방지)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)