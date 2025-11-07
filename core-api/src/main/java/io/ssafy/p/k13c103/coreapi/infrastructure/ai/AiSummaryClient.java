package io.ssafy.p.k13c103.coreapi.infrastructure.ai;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.AiSummaryKeywordsResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiSummaryClient {

    private final RestClient restClient = RestClient.builder()
            .baseUrl("http://localhost:8001")   // TODO: 환경 변수로 분리
            .build();

    public AiSummaryKeywordsResponseDto summarizeGroupText(String text) {
        try {
            return restClient.post()
                    .uri("/summarize")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "text", text,
                            "maxLength", 150,
                            "minLength", 30
                    ))
                    .retrieve()
                    .body(AiSummaryKeywordsResponseDto.class);
        } catch (RestClientException e) {
            throw new ApiException(ErrorCode.EXTERNAL_API_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new ApiException(ErrorCode.EXTERNAL_API_ERROR);
        }
    }
}
