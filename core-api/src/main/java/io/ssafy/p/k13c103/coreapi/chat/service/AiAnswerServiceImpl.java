package io.ssafy.p.k13c103.coreapi.chat.service;

import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

public class AiAnswerServiceImpl implements AiAnswerService {

    // TODO: FastAPI 주소 추후 확실히 하고 설정 파일로 분리하기
    private final WebClient webClient = WebClient.create("http://localhost:8000");

    // TODO: FastAPI 구현 후 다시 보기
    @Override
    public String generateAnswer(String question, Long modelId) {
        return webClient.post()
                .uri("/api/v1/ai/answer")
                .bodyValue(Map.of("question", question, "modelId", modelId))
                .retrieve()
                .bodyToMono(String.class)
                .block();
    }
}
