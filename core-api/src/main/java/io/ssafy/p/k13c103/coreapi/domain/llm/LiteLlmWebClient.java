package io.ssafy.p.k13c103.coreapi.domain.llm;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.config.properties.AiProcessingProperties;
import io.ssafy.p.k13c103.coreapi.config.properties.GmsProperties;
import io.ssafy.p.k13c103.coreapi.config.properties.LiteLlmProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Service
public class LiteLlmWebClient implements LiteLlmClient {

    private final WebClient liteLlmWebClient;

    private final LiteLlmProperties liteLlmProperties;

    private final GmsProperties gmsProperties;

    private final AiProcessingProperties aiProcessingProperties;

    public LiteLlmWebClient(@Qualifier("liteLlmClient") WebClient liteLlmWebClient, LiteLlmProperties liteLlmProperties, GmsProperties gmsProperties, AiProcessingProperties aiProcessingProperties) {
        this.liteLlmWebClient = liteLlmWebClient;
        this.liteLlmProperties = liteLlmProperties;
        this.gmsProperties = gmsProperties;
        this.aiProcessingProperties = aiProcessingProperties;
    }

    /**
     * 실제 운영용
     */
    @Override
    public void test(String apiKey, String model) {
        Map<String, Object> body = Map.of(
                "model", model,
                "api_key", apiKey,
                "messages", List.of(Map.of("role", "user", "content", "ping")),
                "max_tokens", 1,
                "temperature", 0
        );
        try {
            liteLlmWebClient.post()
                    .uri("/v1/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + liteLlmProperties.getApiKey())
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, this::map4xxToApiEx)
                    .onStatus(HttpStatusCode::is5xxServerError, r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
                    .toBodilessEntity()
                    .block();
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, e.getMessage());
        }
    }

    /**
     * 개발용 (GMS)
     */
    @Override
    public void gmsTest(String apiKey, String model, String provider) {
        String gmsBaseUrl = gmsProperties.getBaseUrl();

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(Map.of("role", "user", "content", "ping")),
                "max_tokens", 1,
                "temperature", 0
        );
        try {
            if (provider.equals("openai")) {
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
            } else if (provider.equals("gemini") || provider.equals("google")) {
                WebClient client = liteLlmWebClient.mutate().baseUrl(gmsBaseUrl + "/generativelanguage.googleapis.com").build();
                body = Map.of(
                        "contents", List.of(Map.of(
                                "role", "user",
                                "parts", List.of(Map.of("text", "ping"))
                        )),
                        "generationConfig", Map.of(
                                "temperature", 0,
                                "maxOutputTokens", 1
                        )
                );
                client.post()
                        .uri(uriBuilder -> uriBuilder
                                .path("/v1beta/models/{model}:generateContent")
                                .queryParam("key", apiKey)
                                .build(model))
                        .bodyValue(body)
                        .retrieve()
                        .onStatus(HttpStatusCode::is4xxClientError, this::map4xxToApiEx)
                        .onStatus(HttpStatusCode::is5xxServerError, r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
                        .toBodilessEntity()
                        .block();
            } else if (provider.equals("anthropic") || provider.equals("claude")) {
                WebClient client = liteLlmWebClient.mutate().baseUrl(gmsBaseUrl + "/api.anthropic.com").build();
                body = Map.of(
                        "model", model,
                        "max_tokens", 1,
                        "temperature", 0,
                        "messages", List.of(Map.of(
                                "role", "user",
                                "content", "ping"
                        ))
                );
                client.post()
                        .uri("/v1/messages")
                        .header("x-api-key", apiKey)
                        .header("anthropic-version", "2023-06-01")
                        .bodyValue(body)
                        .retrieve()
                        .onStatus(HttpStatusCode::is4xxClientError, this::map4xxToApiEx)
                        .onStatus(HttpStatusCode::is5xxServerError, r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
                        .toBodilessEntity()
                        .block();
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR, e.getMessage());
        }
    }

    /**
     * 스트리밍 기반 채팅 생성
     * - useLlm = true -> LiteLLM
     * - useLlm = false -> GMS
     */
    @Override
    public Flux<String> createChatStream(String apiKey, String model, String provider, List<Map<String, String>> messages, boolean useLlm) {
        String gmsBaseUrl = gmsProperties.getBaseUrl();
        String masterKey = liteLlmProperties.getApiKey();

        boolean streamEnabled = aiProcessingProperties.isStreamEnabled();
        double temperature = aiProcessingProperties.getTemperature();

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", messages,
                "stream", streamEnabled ,
                "temperature", temperature
        );

        if (useLlm) {
            Map<String, Object> llmBody = Map.of(
                    "model", model,
                    "api_key", apiKey,
                    "messages", messages,
                    "stream", streamEnabled,
                    "temperature", temperature
            );

            return liteLlmWebClient.post()
                    .uri("/v1/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + masterKey)
                    .bodyValue(llmBody)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, this::map4xxToApiEx)
                    .onStatus(HttpStatusCode::is5xxServerError,
                            r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
                    .bodyToFlux(String.class);
        } else {
            switch (provider.toLowerCase()) {
                case "openai": {
                    WebClient client = liteLlmWebClient.mutate()
                            .baseUrl(gmsBaseUrl + "/api.openai.com")
                            .build();

                    return client.post()
                            .uri("/v1/chat/completions")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                            .bodyValue(body)
                            .retrieve()
                            .onStatus(HttpStatusCode::is4xxClientError, this::map4xxToApiEx)
                            .onStatus(HttpStatusCode::is5xxServerError,
                                    r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
                            .bodyToFlux(String.class);
                }

                case "gemini":
                case "google": {
                    WebClient client = liteLlmWebClient.mutate()
                            .baseUrl(gmsBaseUrl + "/generativelanguage.googleapis.com")
                            .build();

                    Map<String, Object> geminiBody = Map.of(
                            "contents", List.of(Map.of(
                                    "role", "user",
                                    "parts", List.of(Map.of("text", mergeMessages(messages)))
                            )),
                            "generationConfig", Map.of(
                                    "temperature", temperature
                            ),
                            "stream", streamEnabled
                    );

                    return client.post()
                            .uri(uriBuilder -> uriBuilder
                                    .path("/v1beta/models/{model}:streamGenerateContent")
                                    .queryParam("key", apiKey)
                                    .build(model))
                            .bodyValue(geminiBody)
                            .retrieve()
                            .onStatus(HttpStatusCode::is4xxClientError, this::map4xxToApiEx)
                            .onStatus(HttpStatusCode::is5xxServerError,
                                    r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
                            .bodyToFlux(String.class);
                }
                case "anthropic":
                case "claude": {
                    WebClient client = liteLlmWebClient.mutate()
                            .baseUrl(gmsBaseUrl + "/api.anthropic.com")
                            .build();

                    Map<String, Object> claudeBody = Map.of(
                            "model", model,
                            "temperature", temperature,
                            "stream", streamEnabled,
                            "messages", messages
                    );

                    return client.post()
                            .uri("/v1/messages")
                            .header("x-api-key", apiKey)
                            .header("anthropic-version", "2023-06-01")
                            .bodyValue(claudeBody)
                            .retrieve()
                            .onStatus(HttpStatusCode::is4xxClientError, this::map4xxToApiEx)
                            .onStatus(HttpStatusCode::is5xxServerError,
                                    r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
                            .bodyToFlux(String.class);
                }

                default:
                    return Flux.error(new ApiException(ErrorCode.PROVIDER_NOT_FOUND));
            }
        }
    }

    private String mergeMessages(List<Map<String, String>> messages) {
        StringBuilder sb = new StringBuilder();
        for (Map<String, String> msg : messages) {
            sb.append(msg.getOrDefault("content", "")).append("\n");
        }
        return sb.toString().trim();
    }

    private Mono<? extends Throwable> map4xxToApiEx(ClientResponse response) {
        return response.bodyToMono(String.class).defaultIfEmpty("")
                .map(__ -> switch (response.statusCode().value()) {
                    case 401, 403 -> new ApiException(ErrorCode.INVALID_KEY);
                    case 429 -> new ApiException(ErrorCode.RATE_LIMITED);
                    default -> new ApiException(ErrorCode.UPSTREAM_ERROR);
                });
    }
}
