package io.ssafy.p.k13c103.coreapi.domain.chat.service;

import io.ssafy.p.k13c103.coreapi.domain.chat.dto.AiSummaryKeywordResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

@Slf4j
@Service
public class AiSummaryServiceImpl implements AiSummaryService {

    private final RestClient restClient = RestClient.builder()
            .baseUrl("http://localhost:8001/api/v1/ai")
            .build();

    @Override
    public AiSummaryKeywordResponseDto generateSummaryAndKeywords(String text) {
        try {
            AiSummaryKeywordResponseDto response = restClient.post()
                    .uri("/summarize")
                    .body(Map.of("text", text))
                    .retrieve()
                    .body(AiSummaryKeywordResponseDto.class);

            return response != null ? response : new AiSummaryKeywordResponseDto();
        } catch (RestClientException e) {
            log.error("[AI] 요약/키워드 생성 실패: {}", e.getMessage());
            return new AiSummaryKeywordResponseDto();
        }
    }
}
