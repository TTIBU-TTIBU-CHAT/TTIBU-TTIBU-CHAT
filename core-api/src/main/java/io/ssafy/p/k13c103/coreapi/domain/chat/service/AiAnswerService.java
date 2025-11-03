package io.ssafy.p.k13c103.coreapi.domain.chat.service;

public interface AiAnswerService {

    /**
     * TODO: 질문에 대한 AI 답변 생성 -> 수정해야 함!!
     * LiteLLM 호출형식으로? 모델과 API Key, 프롬프트된 내용을 보내서 받아와야 함
     * 그리고 토큰 사용량도 [DONE] 이전에 total_token 처럼 온다고 하니까 이것도 저장시켜야 함
     * @param question 사용자 질문
     * @param modelId  사용할 모델 ID
     * @return AI가 생성한 답변 텍스트
     */
    String generateAnswer(String question, Long modelId);
}
