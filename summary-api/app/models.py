# app/models.py
# ----------------------------------------------------
# Pydantic 모델 정의
# - TextRequest
# - SummaryKeywordResponse
# - TitleRequest
# - TitleResponse
# ----------------------------------------------------

from pydantic import BaseModel
from typing import List, Optional


# =====  요청 모델 =====

class TextRequest(BaseModel):
    text: str
    maxLength: int = 150
    minLength: int = 50


class TitleRequest(BaseModel):
    text: str
    maxLength: int = 25
    minLength: int = 10


# =====  응답 모델 =====

class SummaryKeywordResponse(BaseModel):
    summary: str
    keywords: List[str]
    processingTimeMs: int


class TitleResponse(BaseModel):
    title: str
    processingTimeMs: int
