# app/services.py
# ----------------------------------------------------
# 요약: Qwen2.5-1.5B-Instruct (CPU 최적화 버전)
# 키워드: KRWordRank + KeyBERT
# 제목: Qwen + 후처리
# ----------------------------------------------------

import re
import torch
from transformers import Qwen2Tokenizer
from transformers import AutoTokenizer, AutoModelForCausalLM
from krwordrank.word import KRWordRank
from keybert import KeyBERT

# ----------------------------------------------------
# LLM 설정
# ----------------------------------------------------
MODEL_NAME = "Qwen/Qwen2.5-Mini"
DEVICE = "cpu"

print(f"📌 Loading Qwen model: {MODEL_NAME} (CPU)")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float32,
    low_cpu_mem_usage=True,
    device_map=DEVICE,
)
model.eval()

print("📌 Loading KeyBERT...")
kw_model = KeyBERT(model="jhgan/ko-sroberta-multitask")
print("✅ All models loaded.")


# ----------------------------------------------------
# 텍스트 길이 제한 (기본 개선형: 500자)
# ----------------------------------------------------
def shrink_text(text: str, limit: int = 500) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit] + "..."


# ----------------------------------------------------
# 1) 요약 생성 (기본 개선형)
# ----------------------------------------------------
def generate_summary(text: str, max_len: int = 150, min_len: int = 50) -> str:
    text = shrink_text(text, 500)

    prompt = f"""
아래 글을 {min_len}~{max_len}자의 한 문단으로 자연스럽게 요약하세요.

❗ 금지 규칙:
- 리스트/구조화 금지
- 마크다운(#, -, *, •) 금지
- "정리해 드립니다", "요약하면" 같은 표현 금지
- 두 문단 이상 금지

본문:
{text}

요약:
"""

    inputs = tokenizer(prompt, return_tensors="pt").to(DEVICE)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=120,  # 기본 개선형
            do_sample=False,
        )

    decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)
    summary = decoded.split("요약:")[-1].strip()

    # 후처리: 마크다운, 리스트 제거
    summary = re.sub(r"[#*\-•].*", "", summary).strip()

    # "무..." 같은 이상한 끊김 방지
    summary = re.sub(r"[가-힣]\Z", "", summary).strip()

    return summary


# ----------------------------------------------------
# 2) 키워드 추출 (기본 개선형)
# ----------------------------------------------------
STOPWORDS = {
    "이번","저번","다음","이","그","저","이런","그런","저런",
    "것","수","등","점","때","곳","중","내","외",
    "그리고","그러나","하지만","또한","또",
}

POSTFIX = ["의","은","는","이","가","을","를","에","에서","으로","로","과","와"]


def clean_keyword(word: str) -> str:
    w = word.strip()

    # 조사 제거
    for pf in POSTFIX:
        if w.endswith(pf) and len(w) > len(pf) + 1:
            w = w[: -len(pf)]

    w = re.sub(r"[^\w가-힣]", "", w)
    if re.fullmatch(r"[\W\d]+", w):
        return ""

    return w


def extract_keywords(text: str) -> list[str]:
    text = shrink_text(text, 800)

    sentences = [s.strip() for s in re.split(r"[.!?\n]+", text) if s.strip()]
    if not sentences:
        sentences = [text]

    # KRWordRank
    try:
        extractor = KRWordRank(min_count=2, max_length=10, verbose=False)
        scores, _, _ = extractor.extract(sentences, beta=0.85, max_iter=10)
        kw1 = list(scores.keys())
    except:
        kw1 = []

    # KeyBERT
    try:
        kw2_pairs = kw_model.extract_keywords(
            text, top_n=10, keyphrase_ngram_range=(1, 1),
            use_mmr=True, diversity=0.7
        )
        kw2 = [w for w, _ in kw2_pairs]
    except:
        kw2 = []

    # 병합 + 필터링
    merged = []
    seen = set()

    def add(w: str):
        w = clean_keyword(w)
        if not w:
            return
        if len(w) < 2:
            return
        if w in STOPWORDS:
            return
        if w in seen:
            return
        seen.add(w)
        merged.append(w)

    for w in kw2 + kw1:
        if len(merged) >= 5:
            break
        add(w)

    return merged or ["키워드 없음"]


# ----------------------------------------------------
# 3) 제목 생성 (기본 개선형)
# ----------------------------------------------------
def generate_title(text: str, max_len: int = 25, min_len: int = 10) -> str:
    text = shrink_text(text, 400)

    prompt = f"""
다음 글의 내용을 기반으로 한 줄 제목을 만들되,
제목 외의 다른 문장은 절대 출력하지 마세요.

본문:
{text}

제목:
"""

    inputs = tokenizer(prompt, return_tensors="pt").to(DEVICE)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=60,
            do_sample=False
        )

    decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)
    title = decoded.split("제목:")[-1].strip()

    # 1) 여러 줄 → 첫 줄만
    title = title.splitlines()[0].strip()

    # 2) 따옴표 제거
    title = title.strip('"').strip("'")

    # 3) 마크다운 기호 제거
    title = re.sub(r"[#*\-•`]", "", title).strip()

    # 4) 마지막 음절 한 글자 잘림 보정
    if len(title) >= 2 and re.fullmatch(r"[가-힣]", title[-1]):
        title = title[:-1].rstrip()

    # 5) 길이 제한
    if len(title) > max_len:
        title = title[:max_len].rstrip()
        if len(title) >= 2 and re.fullmatch(r"[가-힣]", title[-1]):
            title = title[:-1].rstrip()

    # 6) 최소 길이 보정
    if len(title) < min_len:
        title = "요약 제목"

    return title
