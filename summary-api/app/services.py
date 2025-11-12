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
def _get_sentence_keywords(sentence: str) -> set:
    """문장에서 핵심 명사 추출 (유사 문장 감지용)"""
    words = re.findall(r'[가-힣]{2,}', sentence)
    # 조사/어미 제거하고 명사만 추출
    keywords = set()
    for w in words:
        w = re.sub(r'(은|는|이|가|을|를|에|서|으로|와|과|의|도|로|고|며|다)$', '', w)
        if len(w) >= 2:
            keywords.add(w)
    return keywords

def generate_summary(text: str, max_len: int = 150, min_len: int = 50) -> str:
    """텍스트 요약 + 중복/유사 문장 제거 (개선 버전)"""
    text = preprocess_text(text)
    input_ids = sum_tokenizer.encode(
        text, return_tensors="pt", max_length=1024, truncation=True
    ).to(DEVICE)

    summary_ids = sum_model.generate(
        input_ids,
        max_length=max_len,
        min_length=min_len,
        num_beams=5,  # beam 수 증가 (더 많은 후보 탐색)
        repetition_penalty=4.0,  # 반복 페널티 더 증가 (원문 복사 방지)
        length_penalty=1.0,  # 길이 페널티 줄임 (너무 길어지는 걸 방지)
        no_repeat_ngram_size=3,  # 3-gram 반복 방지
        early_stopping=True,
    )

    summary = sum_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    summary = re.sub(r"\s+", " ", summary).strip()

    # 중복/유사 문장 제거 (개선)
    parts = [p.strip() for p in re.split(r"[.!?]\s*", summary) if p.strip()]
    dedup = []
    seen_exact = set()
    seen_keywords = []

    for p in parts:
        # 1. 완전 동일한 문장 제거
        if p in seen_exact:
            continue

        # 2. 유사 문장 제거 (70% 이상 키워드 겹치면 제외)
        p_keywords = _get_sentence_keywords(p)
        is_similar = False
        for prev_keywords in seen_keywords:
            if not p_keywords or not prev_keywords:
                continue
            overlap = len(p_keywords & prev_keywords)
            similarity = overlap / min(len(p_keywords), len(prev_keywords))
            if similarity > 0.7:  # 70% 이상 유사
                is_similar = True
                break

        if not is_similar:
            dedup.append(p)
            seen_exact.add(p)
            seen_keywords.append(p_keywords)

    result = ". ".join(dedup).strip()
    return result if result else summary

# ----------------------------------------------------
# 🔎 키워드 (KRWordRank + KeyBERT 하이브리드)
# ----------------------------------------------------

# 한국어 불용어 리스트 (키워드에서 제외할 단어들)
STOPWORDS = {
    # 지시어
    "이번", "저번", "다음", "이", "그", "저", "이런", "그런", "저런", "이러한", "그러한",
    "여기", "거기", "저기", "이것", "그것", "저것", "이곳", "그곳", "저곳", "새로운",
    # 일반 동사/형용사
    "하다", "되다", "있다", "없다", "이다", "아니다", "같다", "보다", "말하다",
    "발표", "전망", "예상", "계획", "준비", "진행", "실시", "추진", "검토",
    "공개", "사용", "탑재", "향상", "개발", "출시", "적용", "채택",
    # 시간/위치 부사
    "최근", "오늘", "어제", "내일", "올해", "작년", "내년", "항상", "가끔", "자주",
    "상반기", "하반기", "분기", "연말", "연초", "현재", "과거", "미래",
    # 정도 부사 (추가)
    "대폭", "크게", "많이", "적게", "매우", "아주", "정말", "너무", "상당히", "굉장히",
    # 접속사/조사
    "그리고", "하지만", "그러나", "또한", "또", "및", "등", "경우", "때문",
    # 기타 일반어
    "것", "수", "등", "점", "때", "곳", "중", "내", "외", "간", "상", "대", "전", "후",
    "위", "아래", "안", "밖", "앞", "뒤", "소재", "센서"
}

def clean_keyword(kw: str) -> str:
    """키워드 정제: 명사의 조사만 제거 (동사/형용사 어미는 보존)"""
    # 특수문자 제거 (숫자는 유지)
    kw = re.sub(r"[^가-힣a-zA-Z0-9\s%]", "", kw)
    kw = re.sub(r"\s+", " ", kw)

    # 조사 제거 전략:
    # - 동사/형용사로 끝나는 경우 조사 제거 안 함
    # - 예: "감축하는", "되는", "있는" 등은 그대로 유지

    # "는"/"은" 처리: 동사형 (용언+는)이 아닐 때만 제거
    # 용언으로 끝나는 패턴: ~하는, ~되는, ~있는, ~스는, ~르는 등
    if not re.search(r'[가-힣]{2,}[하되있없가오보스르]는$', kw):
        kw = re.sub(r"(은|는)$", "", kw)

    # 나머지 조사 제거 (명사 뒤에만)
    kw = re.sub(r"(이|가|을|를|에|에서|에게|으로|로|와|과|의|도|만|부터|까지)$", "", kw)

    return kw.strip()

def is_valid_keyword(kw: str) -> bool:
    """키워드 유효성 검사: 불용어, 숫자만, 불완전한 표현 필터링 (엄격 버전)"""
    if not kw or len(kw) < 2:
        return False

    # 불용어 체크
    if kw.lower() in STOPWORDS:
        return False

    # 각 단어별로 불용어 체크 (복합명사 내 불용어 제거)
    words = kw.split()
    for word in words:
        if word.lower() in STOPWORDS:
            return False

    # 숫자만 있는 경우 제외 (예: "15", "30")
    if re.match(r"^\d+$", kw):
        return False

    # 숫자+기호만 있는 경우 제외 (예: "15%", "30%", "3.5")
    if re.match(r"^[\d\.\,\%]+$", kw):
        return False

    # 순수 숫자로 시작하는 단일 키워드 제외 (예: "30", "2023")
    # 단, "3나노", "5G" 같은 건 허용
    if re.match(r"^\d+$", kw.split()[0]) if len(kw.split()) == 1 else False:
        return False

    # 조사로 끝나는 경우 제외 (확장)
    if re.search(r"(은|는|이|가|을|를|에서|에게|으로|로|와|과|도|만|고|며|서|니다|습니다|했다|됐다)$", kw):
        return False

    # 동사/부사 형태로 끝나는 경우 제외
    if re.search(r"(빠르게|크게|많이|적게|매우|아주|정말|너무|조금|대비|시켰다|시켰으며)$", kw):
        return False

    # 동사 어간으로 끝나는 경우 제외
    if re.search(r"(향상|소비|개발|기술)$", kw) and kw.count(" ") > 0:
        # 단일 단어면 OK, 복합어면 의심스러움 (예: "성능은 15 향상")
        return False

    # 길이 제한 (최대 15자로 줄임)
    if len(kw) > 15:
        return False

    # 한글이 하나도 없고 영문/숫자만 있는 경우 제외 (영문 약어 2자 이상은 허용)
    if not re.search(r"[가-힣]", kw):
        # 영문만 있고 2자 미만이면 제외
        if re.match(r"^[a-zA-Z]+$", kw) and len(kw) < 2:
            return False
        # 숫자가 포함된 경우 한글 필수
        if re.search(r"\d", kw):
            return False

    return True

def extract_keywords(text: str) -> list[str]:
    """범용적 키워드 추출: 명사 중심, 균형잡힌 필터링"""
    try:
        # 1️⃣ KRWordRank (한국어 명사 추출)
        wordrank_extractor = KRWordRank(min_count=1, max_length=10, verbose=False)
        sents = [s.strip() for s in re.split(r"[.!?]\s*", text) if s.strip()]
        if not sents:
            sents = [text]
        kw_scores, _, _ = wordrank_extractor.extract(sents, beta=0.85, max_iter=10)

        # 점수 높은 순으로 정렬
        kr_kws = sorted(kw_scores.items(), key=lambda x: x[1], reverse=True)
        kr_kws = [kw for kw, score in kr_kws[:30]]

        # 2️⃣ KeyBERT (의미 기반, 점수 포함)
        kb_pairs = kw_model.extract_keywords(
            text,
            top_n=20,
            keyphrase_ngram_range=(1, 1),  # 단일어만
            use_mmr=True,
            diversity=0.7
        )
        # KeyBERT는 점수가 높을수록 중요
        keybert_kws_with_score = [(kw, score) for kw, score in kb_pairs]

        # 3️⃣ 정제 및 선별
        merged = []
        seen = set()

        # KeyBERT 우선 (의미 기반이라 품질 높음)
        for kw, score in keybert_kws_with_score:
            if len(merged) >= 5:
                break

            cleaned = clean_keyword(kw)
            if not cleaned or len(cleaned) < 2:
                continue

            if cleaned in seen:
                continue

            # 공백 금지
            if " " in cleaned:
                continue

            # 조사 체크
            if re.search(r'(을|를|이|가|은|는|에|의|로|와|과|도)', cleaned):
                continue

            # 동사 어미 체크 (완화 - 기본형만)
            if re.search(r'(하다|되다|했다|된다|있다|하며|되며|했으며)$', cleaned):
                continue

            # 관형사형 어미 (핵심만)
            if re.search(r'(한|된|할|될)$', cleaned):
                continue

            # 길이: 2-7글자 (완화)
            if len(cleaned) < 2 or len(cleaned) > 7:
                continue

            # 불용어 체크
            if cleaned.lower() in STOPWORDS:
                continue

            # 유효성 검사
            if not is_valid_keyword(cleaned):
                continue

            merged.append(cleaned)
            seen.add(cleaned)

        # 4️⃣ 부족하면 KRWordRank 추가
        if len(merged) < 5:
            for kw in kr_kws:
                if len(merged) >= 5:
                    break

                cleaned = clean_keyword(kw)
                if not cleaned or len(cleaned) < 2 or cleaned in seen:
                    continue

                if " " in cleaned:
                    continue

                if re.search(r'(을|를|이|가|은|는|에|의|로)', cleaned):
                    continue

                if re.search(r'(하다|되다|했다|한|된)$', cleaned):
                    continue

                if len(cleaned) > 7:
                    continue

                if cleaned.lower() in STOPWORDS:
                    continue

                if not is_valid_keyword(cleaned):
                    continue

                merged.append(cleaned)
                seen.add(cleaned)

        return merged if merged else ["키워드 없음"]
    except Exception as e:
        print(f"[Error] Keyword extraction failed: {e}")
        return []

# ----------------------------------------------------
# 📰 제목 (짧은 뉴스 타이틀형)
# ----------------------------------------------------
def generate_title(text: str, max_len: int = 25, min_len: int = 10) -> str:
    """키워드 기반 제목 생성 (단순하고 범용적)"""

    # 1️⃣ 키워드 추출 (상위 4개)
    keywords = extract_keywords(text)[:4]

    if not keywords or keywords == ["키워드 없음"]:
        return "제목 없음"

    # 2️⃣ 키워드 조합 (길이 제한 고려)
    title_parts = []
    current_length = 0

    for kw in keywords:
        # 공백 포함 길이 계산
        kw_len = len(kw) + (1 if title_parts else 0)  # 앞에 공백 추가

        if current_length + kw_len <= max_len:
            title_parts.append(kw)
            current_length += kw_len
        else:
            break  # 더 이상 추가하면 max_len 초과

        if len(title_parts) >= 4:  # 최대 4개
            break

    # 3️⃣ 최종 제목 생성
    if not title_parts:
        # 최악의 경우 첫 번째 키워드라도 사용
        title_parts = keywords[:1]

    title = " ".join(title_parts)

    # 4️⃣ 최종 길이 체크
    if len(title) > max_len:
        # 단어 단위로 축약
        words = title.split()
        title = " ".join(words[:3])

    return title.strip() if title else "제목 없음"
