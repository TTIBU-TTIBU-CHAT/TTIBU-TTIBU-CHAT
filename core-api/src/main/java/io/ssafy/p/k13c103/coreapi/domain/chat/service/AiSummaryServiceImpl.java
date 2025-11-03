package io.ssafy.p.k13c103.coreapi.domain.chat.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Slf4j
@Service
public class AiSummaryServiceImpl implements AiSummaryService {

    private final WebClient webClient = WebClient.create("http://localhost:8000");

    @Override
    public String generateSummary(String answer) {
        try {
            return webClient.post()
                    .uri("/api/v1/ai/summary")
                    .bodyValue(Map.of("text", answer))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception e) {
            log.error("[AI] 요약 생성 실패: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public String generateKeywords(String answer) {
        try {
            return webClient.post()
                    .uri("/api/v1/ai/keywords")
                    .bodyValue(Map.of("text", answer))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception e) {
            log.error("[AI] 키워드 생성 실패: {}", e.getMessage());
            return "[]";
        }
    }
}
