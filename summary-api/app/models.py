from pydantic import BaseModel
from typing import List, Optional

class TextRequest(BaseModel):
    """API가 입력으로 받을 텍스트와 옵션"""
    text: str
    maxLength: Optional[int] = 150  # 기본값 150
    minLength: Optional[int] = 50   # 기본값 50

class SummaryKeywordResponse(BaseModel):
    """API가 반환할 요약 + 키워드"""
    summary: str
    keywords: List[str]
    processingTimeMs: Optional[int] = None  # 처리 시간