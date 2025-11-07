import re
import torch
from transformers import PreTrainedTokenizerFast, BartForConditionalGeneration
from keybert import KeyBERT
from krwordrank.word import KRWordRank

# ----------------------------------------------------
# ✅ 공개로 존재하는 모델 ID
#   - 요약: gogamza/kobart-summarization
#   - 제목(짧은 뉴스 타이틀): gogamza/kobart-title
# ----------------------------------------------------
SUM_MODEL_NAME = "gogamza/kobart-summarization"
TITLE_MODEL_NAME = "heegyu/kobart-title"

print("모델 로딩 중...")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def _load_model(model_name: str):
    tok = PreTrainedTokenizerFast.from_pretrained(model_name)
    mdl = BartForConditionalGeneration.from_pretrained(model_name).to(DEVICE)
    return tok, mdl

try:
    sum_tokenizer, sum_model = _load_model(SUM_MODEL_NAME)
except Exception as e:
    print(f"[WARN] 요약 모델 로드 실패({SUM_MODEL_NAME}): {e}. digit82/kobart-summarization 으로 폴백합니다.")
    SUM_MODEL_NAME = "digit82/kobart-summarization"
    sum_tokenizer, sum_model = _load_model(SUM_MODEL_NAME)

try:
    title_tokenizer, title_model = _load_model(TITLE_MODEL_NAME)
except Exception as e:
    print(f"[WARN] 제목 모델 로드 실패({TITLE_MODEL_NAME}): {e}. 요약 모델 재사용으로 폴백합니다.")
    title_tokenizer, title_model = sum_tokenizer, sum_model

kw_model = KeyBERT(model="jhgan/ko-sroberta-multitask")

print(f"모델 로드 완료 (device={DEVICE})")
print(f"- SUMMARY: {SUM_MODEL_NAME}")
print(f"- TITLE  : {TITLE_MODEL_NAME if title_model is not sum_model else SUM_MODEL_NAME}")

# ----------------------------------------------------
# 🔧 전처리
# ----------------------------------------------------
def preprocess_text(text: str) -> str:
    """불필요 공백/따옴표 제거 + 문장 단위로 3~4개만 사용"""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[\"\'‘’“”]", "", text)
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return " ".join(sentences[:4])

# ----------------------------------------------------
# 📝 요약
# ----------------------------------------------------
def generate_summary(text: str, max_len: int = 150, min_len: int = 50) -> str:
    text = preprocess_text(text)
    input_ids = sum_tokenizer.encode(
        text, return_tensors="pt", max_length=1024, truncation=True
    ).to(DEVICE)

    summary_ids = sum_model.generate(
        input_ids,
        max_length=max_len,
        min_length=min_len,
        num_beams=4,
        repetition_penalty=3.0,
        length_penalty=1.3,
        no_repeat_ngram_size=5,
        early_stopping=True,
    )

    summary = sum_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    summary = re.sub(r"\s+", " ", summary).strip()

    # 중복 문장 제거
    parts = [p.strip() for p in re.split(r"[.]\s*", summary) if p.strip()]
    seen = set()
    dedup = []
    for p in parts:
        if p not in seen:
            seen.add(p)
            dedup.append(p)
    return ". ".join(dedup).strip()

# ----------------------------------------------------
# 🔎 키워드 (KRWordRank + KeyBERT 하이브리드)
# ----------------------------------------------------
def clean_keyword(kw: str) -> str:
    kw = re.sub(r"[^가-힣a-zA-Z0-9\s]", "", kw)
    kw = re.sub(r"\s+", " ", kw)
    kw = re.sub(r"(은|는|이|가|을|를|에|에서|으로|와|과|의|도|로|하다|된다|했다)$", "", kw)
    return kw.strip()

def extract_keywords(text: str) -> list[str]:
    try:
        # KRWordRank
        wordrank_extractor = KRWordRank(min_count=2, max_length=10, verbose=False)
        sents = [s.strip() for s in re.split(r"[.!?]\s*", text) if s.strip()]
        if not sents:
            sents = [text]
        kw_scores, _, _ = wordrank_extractor.extract(sents, beta=0.85, max_iter=10)
        kr_kws = list(kw_scores.keys())[:5]

        # KeyBERT
        kb_pairs = kw_model.extract_keywords(text, top_n=7, keyphrase_ngram_range=(1, 3), use_mmr=True, diversity=0.9)
        keybert_kws = [p[0] for p in kb_pairs]

        # 병합 + 정제
        merged = []
        for kw in kr_kws + keybert_kws:
            c = clean_keyword(kw)
            if 2 <= len(c) <= 20 and c not in merged:
                merged.append(c)
            if len(merged) >= 5:
                break
        return merged
    except Exception as e:
        print(f"[Error] Keyword extraction failed: {e}")
        return []

# ----------------------------------------------------
# 📰 제목 (짧은 뉴스 타이틀형)
# ----------------------------------------------------
def generate_title(text: str, max_len: int = 20, min_len: int = 5) -> str:
    """짧고 자연스러운 headline 생성 (서술형 → 명사구 변환 후처리 포함)"""
    input_text = preprocess_text(text)
    input_ids = title_tokenizer.encode(
        input_text, return_tensors="pt", max_length=512, truncation=True
    ).to(DEVICE)

    out_ids = title_model.generate(
        input_ids,
        max_length=max_len,
        min_length=min_len,
        num_beams=4,
        repetition_penalty=2.5,
        length_penalty=1.1,
        no_repeat_ngram_size=4,
        early_stopping=True,
    )

    # 1️⃣ 모델 결과 디코딩
    title = title_tokenizer.decode(out_ids[0], skip_special_tokens=True)
    title = re.sub(r"\s+", " ", title).strip()

    # 2️⃣ 서술형 → headline형으로 변환
    # ✅ 조사 제거: 단어와 분리된 조사만 제거
    title = re.sub(r"(으로|로|에서|에|에게|을|를|은|는|이|가|와|과)(\b|[가-힣])", " ", title)
    title = re.sub(r"(과 함께|와 함께|함께)(\s|$)", "", title)
    title = re.sub(r"(다|된다|밝혔다|예정이다|것으로|분석된다|나타났다|했다)$", "", title)
    title = re.sub(r"(것이|주된 요인|주요 원인|으로 분석)$", "", title)
    title = re.sub(r"\s+", " ", title).strip(" .,")

    # 3️⃣ 길이 정리
    words = title.split()
    if len(words) > 4:
        title = " ".join(words[:4])
    if len(title) > 25:
        title = title[:25].rsplit(" ", 1)[0]

    return title
