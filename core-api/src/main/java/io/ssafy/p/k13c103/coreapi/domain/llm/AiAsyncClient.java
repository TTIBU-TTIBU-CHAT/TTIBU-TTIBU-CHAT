package io.ssafy.p.k13c103.coreapi.domain.llm;

import io.ssafy.p.k13c103.coreapi.config.properties.SummaryApiProperties;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.AiShortSummaryResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.AiSummaryKeywordsResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
public class AiAsyncClient {

    private static final int LONG_SUMMARY_MAX_LENGTH = 150;
    private static final int LONG_SUMMARY_MIN_LENGTH = 30;
    private static final int SHORT_SUMMARY_MAX_LENGTH = 30;
    private static final int SHORT_SUMMARY_MIN_LENGTH = 5;
    private final WebClient webClient;
    private final SummaryApiProperties summaryApiProperties;


    public AiAsyncClient(@Qualifier("aiWebClient") WebClient webClient, SummaryApiProperties summaryApiProperties) {
        this.webClient = webClient;
        this.summaryApiProperties = summaryApiProperties;
    }

    /**
     * FastAPI: 긴 요약 + 키워드
     * - ChatServiceImpl 등에서 @Async("aiTaskExecutor")와 함께 사용
     * - CompletableFuture로 결과 반환
     */
    @Async("aiTaskExecutor")
    public CompletableFuture<AiSummaryKeywordsResponseDto> summarizeAsync(String text) {
        String url = summaryApiProperties.getBaseUrl() + "/summarize";

        return webClient.post()
                .uri(url)
                .bodyValue(Map.of(
                        "text", text,
                        "maxLength", LONG_SUMMARY_MAX_LENGTH,
                        "minLength", LONG_SUMMARY_MIN_LENGTH
                ))
                .retrieve()
                .bodyToMono(AiSummaryKeywordsResponseDto.class)
                .timeout(Duration.ofMillis(summaryApiProperties.getTimeoutMs()))
                .doOnSubscribe(sub -> log.info("[AiAsyncClient] FastAPI 요약 요청 시작"))
                .doOnSuccess(res -> log.info("[AiAsyncClient] FastAPI 응답 수신 완료"))
                .doOnError(e -> log.error("[AiAsyncClient] FastAPI 요청 실패: {}", e.getMessage()))
                .onErrorResume(e -> Mono.just(fallbackResponse(e)))
                .toFuture();
    }

    /**
     * FastAPI: 짧은 요약 (제목)
     */
    @Async("aiTaskExecutor")
    public CompletableFuture<AiShortSummaryResponseDto> shortSummaryAsync(String text) {
        String url = summaryApiProperties.getBaseUrl() + "/title-summarize";

        return webClient.post()
                .uri(url)
                .bodyValue(Map.of(
                        "text", text,
                        "maxLength", SHORT_SUMMARY_MAX_LENGTH,
                        "minLength", SHORT_SUMMARY_MIN_LENGTH
                ))
                .retrieve()
                .bodyToMono(AiShortSummaryResponseDto.class)
                .timeout(Duration.ofMillis(summaryApiProperties.getTimeoutMs()))
                .doOnSubscribe(sub -> log.info("[AiAsyncClient] FastAPI 짧은 요약 요청 시작"))
                .doOnSuccess(res -> log.info("[AiAsyncClient] 짧은 요약 응답 완료: {}", res.getTitle()))
                .doOnError(e -> log.error("[AiAsyncClient] FastAPI 짧은 요약 요청 실패: {}", e.getMessage()))
                .onErrorResume(e -> Mono.just(fallbackShortResponse(e)))
                .toFuture();
    }

    /**
     * FastAPI 실패 시 응답 반환 - AiSummaryKeywordsResponseDto
     */
    private AiSummaryKeywordsResponseDto fallbackResponse(Throwable e) {
        log.warn("[AiAsyncClient] Fallback 처리 - {}", e.getMessage());
        AiSummaryKeywordsResponseDto fallback = new AiSummaryKeywordsResponseDto();
        fallback.setSummary(null);
        fallback.setKeywords(List.of());
        fallback.setProcessingTimeMs(0);
        return fallback;
    }

    /**
     * FastAPI 실패 시 응답 반환 - AiShortSummaryResponseDto
     */
    private AiShortSummaryResponseDto fallbackShortResponse(Throwable e) {
        log.warn("[AiAsyncClient] 짧은 요약 실패 Fallback - {}", e.getMessage());
        AiShortSummaryResponseDto fallback = new AiShortSummaryResponseDto();
        fallback.setTitle(null);
        fallback.setProcessingTimeMs(0);
        return fallback;
    }
}
