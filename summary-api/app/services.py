# app/services.py (TF-IDF + KeyBERT Hybrid 3:2 Version)
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from keybert import KeyBERT
from sklearn.feature_extraction.text import TfidfVectorizer
from konlpy.tag import Okt
import torch
import re
import time

# --- 1. 모델 로드 (서버 시작 시 1회 실행) ---
print("모델 로딩 중......")
MODEL_NAME = "lcw99/t5-base-korean-text-summary"
summary_tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
summary_model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)

print("KeyBERT 로딩 중......")
kw_model = KeyBERT(model="distiluse-base-multilingual-cased-v1")

okt = Okt()
print("모델 로드 성공!")

# --- 2. 요약 함수 ---
def generate_summary(text: str, max_len: int, min_len: int) -> str:
    """T5 모델을 이용한 텍스트 요약"""
    inputs = summary_tokenizer.encode(
        text,
        return_tensors="pt",
        max_length=1024,
        truncation=True
    )
    summary_ids = summary_model.generate(
        inputs,
        max_length=max_len,
        min_length=min_len,
        length_penalty=2.0,
        num_beams=4,
        early_stopping=True
    )
    summary = summary_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    return summary

# --- 3. TF-IDF 기반 키워드 추출 ---
def extract_tfidf_keywords(text: str, top_n: int = 5) -> list[str]:
    """Okt + TF-IDF 기반 핵심 명사 추출"""
    try:
        nouns = [
            word for word, tag in okt.pos(text, norm=True, stem=True)
            if tag in {"NNG", "NNP", "SL", "Alpha"} and len(word) > 1
        ]
        if not nouns:
            return []
        joined = " ".join(nouns)
        vectorizer = TfidfVectorizer()
        tfidf = vectorizer.fit_transform([joined])
        scores = zip(vectorizer.get_feature_names_out(), tfidf.toarray()[0])
        sorted_keywords = sorted(scores, key=lambda x: x[1], reverse=True)
        return [kw for kw, _ in sorted_keywords[:top_n]]
    except Exception as e:
        print(f"[Error] TF-IDF keyword extraction failed: {e}")
        return []

# --- 4. KeyBERT 기반 키워드 추출 ---
def extract_keybert_keywords(text: str, top_n: int = 5) -> list[str]:
    """KeyBERT 기반 의미 중심 키워드 추출"""
    try:
        keywords = kw_model.extract_keywords(
            text,
            keyphrase_ngram_range=(1, 2),
            top_n=top_n * 2,
            use_mmr=True,
            diversity=0.7
        )
        filtered = [kw for kw, score in keywords if score > 0.15]
        cleaned = []
        for kw in filtered:
            kw = re.sub(r"[^가-힣a-zA-Z0-9\s]", "", kw).strip().lower()
            kw = re.sub(r"(은|는|이|가|을|를|에|에서|으로|와|과|의|도|로)$", "", kw)
            if len(kw) < 2 or kw in cleaned:
                continue
            cleaned.append(kw)
            if len(cleaned) >= top_n:
                break
        return cleaned
    except Exception as e:
        print(f"[Error] KeyBERT keyword extraction failed: {e}")
        return []

# --- 5. Hybrid (TF-IDF 3개 + KeyBERT 2개) ---
def extract_keywords(text: str) -> list[str]:
    """
    TF-IDF + KeyBERT 하이브리드 키워드 추출
    - TF-IDF: 형태 기반 (3개)
    - KeyBERT: 의미 기반 (2개)
    """
    start = time.time()

    tfidf_kws = extract_tfidf_keywords(text, top_n=5)
    keybert_kws = extract_keybert_keywords(text, top_n=5)

    # ✅ TF-IDF 3개 + KeyBERT 2개 조합
    merged = tfidf_kws[:3] + [kw for kw in keybert_kws if kw not in tfidf_kws][:2]
    final_keywords = merged[:5]

    print(f"[DEBUG] TF-IDF={tfidf_kws} | KeyBERT={keybert_kws} | Final={final_keywords} "
          f"({int((time.time()-start)*1000)}ms)")
    return final_keywords