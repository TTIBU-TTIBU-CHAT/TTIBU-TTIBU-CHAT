from pydantic import BaseModel
from typing import List, Optional

class TextRequest(BaseModel):
    """본문 입력"""
    text: str
    maxLength: Optional[int] = 150
    minLength: Optional[int] = 50

class SummaryKeywordResponse(BaseModel):
    summary: str
    keywords: List[str]
    processingTimeMs: Optional[int] = None

class TitleRequest(BaseModel):
    text: str
    maxLength: Optional[int] = 25
    minLength: Optional[int] = 10

class TitleResponse(BaseModel):
    title: str
    processingTimeMs: Optional[int] = None
