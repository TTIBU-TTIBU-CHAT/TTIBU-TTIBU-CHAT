package io.ssafy.p.k13c103.coreapi.domain.llm;

import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

public interface LiteLlmClient {

    /**
     * apiKey 유효성 검사: 1토큰짜리 요청 보냄
     */
    void test(String apiKey, String model);

    void gmsTest(String apiKey, String model, String provider);

    Flux<String> createChatStream(String apiKey, String model, String provider, List<Map<String, String>> messages, boolean useLlm);
}