package io.ssafy.p.k13c103.coreapi.domain.llm;

public interface LiteLlmClient {

    /**
     * apiKey 유효성 검사: 1토큰짜리 요청 보냄
     */
    void test(String apiKey, String model);

    // TODO: 채팅 생성
}