package io.ssafy.p.k13c103.coreapi.chat.service;

public interface AiAnswerService {

    /**
     * TODO: 질문에 대한 AI 답변 생성
     * @param question 사용자 질문
     * @param modelId  사용할 모델 ID
     * @return AI가 생성한 답변 텍스트
     */
    String generateAnswer(String question, Long modelId);
}
