package io.ssafy.p.k13c103.coreapi.domain.llm;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LiteLlmWebClient implements LiteLlmClient {

    @Value("${litellm.master.key}")
    private String masterKey;

    @Value("${gms.base.url}")
    private String gmsBaseUrl;

    @Qualifier("liteLlmClient")
    private final WebClient liteLlmWebClient;

    @Override
    public void test(String apiKey, String model) {
        Map<String, Object> body = Map.of(
                "model", model,
//                "api_key", apiKey, // FIXME: 운영 환경에서 주석 해제
                "messages", List.of(Map.of("role", "user", "content", "ping")),
                "max_tokens", 1,
                "temperature", 0
        );
        try {
            // (GMS) FIXME: 운영 환경에서 주석 처리
            WebClient client = liteLlmWebClient.mutate().baseUrl(gmsBaseUrl + "/api.openai.com").build();
            client.post()
                    .uri("/v1/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, this::map4xxToApiEx)
                    .onStatus(HttpStatusCode::is5xxServerError, r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
                    .toBodilessEntity()
                    .block();

            // FIXME: 운영 환경에서 주석 해제
//            liteLlmWebClient.post()
//                    .uri("/v1/chat/completions")
//                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + masterKey)
//                    .bodyValue(body)
//                    .retrieve()
//                    .onStatus(HttpStatusCode::is4xxClientError, this::map4xxToApiEx)
//                    .onStatus(HttpStatusCode::is5xxServerError, r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
//                    .toBodilessEntity()
//                    .block();
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, e.getMessage());
        }
    }

    // TODO: 채팅 생성

    private Mono<? extends Throwable> map4xxToApiEx(ClientResponse response) {
        return response.bodyToMono(String.class).defaultIfEmpty("")
                .map(__ -> switch (response.statusCode().value()) {
                    case 401, 403 -> new ApiException(ErrorCode.INVALID_KEY);
                    case 429 -> new ApiException(ErrorCode.RATE_LIMITED);
                    default -> new ApiException(ErrorCode.UPSTREAM_ERROR);
                });
    }
}
