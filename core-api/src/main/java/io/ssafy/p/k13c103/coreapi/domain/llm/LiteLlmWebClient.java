package io.ssafy.p.k13c103.coreapi.domain.llm;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.config.properties.AiProcessingProperties;
import io.ssafy.p.k13c103.coreapi.config.properties.GmsProperties;
import io.ssafy.p.k13c103.coreapi.config.properties.LiteLlmProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
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
                    .onStatus(HttpStatusCode::is4xxClientError,
                            r -> map4xxToApiEx(r, "litellm", model, false))
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
                        .onStatus(HttpStatusCode::is4xxClientError,
                                r -> map4xxToApiEx(r, "openai", model, false))
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
                        .onStatus(HttpStatusCode::is4xxClientError,
                                r -> map4xxToApiEx(r, "gemini", model, false))
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
                        .onStatus(HttpStatusCode::is4xxClientError,
                                r -> map4xxToApiEx(r, "anthropic", model, false))
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
        final String gmsBaseUrl = gmsProperties.getBaseUrl();
        final String masterKey = liteLlmProperties.getApiKey();

        final boolean streamEnabled = aiProcessingProperties.isStreamEnabled();
        final double temperature = aiProcessingProperties.getTemperature();

        if (useLlm) {
            Map<String, Object> llmBody = Map.of(
                    "model", model,
                    "api_key", apiKey,
                    "messages", messages,
                    "stream", streamEnabled,
                    "temperature", temperature
            );

            var spec = liteLlmWebClient.post()
                    .uri("/v1/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + masterKey)
                    .bodyValue(llmBody);

            return addAcceptIfStream(spec, streamEnabled)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, r -> map4xxToApiEx(r, "litellm", model, streamEnabled))
                    .onStatus(HttpStatusCode::is5xxServerError, r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
                    .bodyToFlux(String.class);
        }

        switch (provider.toLowerCase(Locale.ROOT)) {
            case "openai": {
                // GPT-4 / GPT-5 모두 동일 포맷
                List<Map<String, String>> openAiMsgs = normalizeOpenAiMessages(messages);
                Map<String, Object> body = Map.of(
                        "model", model,
                        "messages", openAiMsgs,
                        "stream", streamEnabled,
                        "temperature", temperature
                );

                WebClient client = liteLlmWebClient.mutate()
                        .baseUrl(gmsBaseUrl + "/api.openai.com")
                        .build();

                var spec = client.post()
                        .uri("/v1/chat/completions")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                        .bodyValue(body);

                return addAcceptIfStream(spec, streamEnabled)
                        .retrieve()
                        .onStatus(HttpStatusCode::is4xxClientError, r -> map4xxToApiEx(r, "openai", model, streamEnabled))
                        .onStatus(HttpStatusCode::is5xxServerError, r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
                        .bodyToFlux(String.class);
            }

            case "gemini":
            case "google": {
                // Gemini는 contents 스키마 필요
                String systemText = messages.stream()
                        .filter(m -> "system".equalsIgnoreCase(m.getOrDefault("role", "")))
                        .map(m -> m.getOrDefault("content", ""))
                        .collect(Collectors.joining("\n")).trim();

                String userText = messages.stream()
                        .filter(m -> !"system".equalsIgnoreCase(m.getOrDefault("role", "")))
                        .map(m -> m.getOrDefault("content", ""))
                        .collect(Collectors.joining("\n")).trim();

                Map<String, Object> body = new HashMap<>();
                body.put("contents", List.of(Map.of("parts", List.of(Map.of("text", userText)))));
                body.put("generationConfig", Map.of("temperature", temperature));
                if (!systemText.isBlank()) {
                    body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemText))));
                }

                String path = streamEnabled
                        ? "/v1beta/models/{model}:streamGenerateContent"
                        : "/v1beta/models/{model}:generateContent";

                WebClient client = liteLlmWebClient.mutate()
                        .baseUrl(gmsBaseUrl + "/generativelanguage.googleapis.com")
                        .build();

                var spec = client.post()
                        .uri(uriBuilder -> uriBuilder.path(path)
                                .queryParam("key", apiKey)
                                .build(model))
                        .bodyValue(body);

                return addAcceptIfStream(spec, streamEnabled)
                        .retrieve()
                        .onStatus(HttpStatusCode::is4xxClientError, r -> map4xxToApiEx(r, "gemini", model, streamEnabled))
                        .onStatus(HttpStatusCode::is5xxServerError, r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
                        .bodyToFlux(String.class);
            }
            case "anthropic":
            case "claude": {
                // Claude는 messages 스키마지만 content는 String (배열 아님)
                List<Map<String, Object>> anthropicMsgs = toAnthropicMessages(messages);

                Map<String, Object> body = new HashMap<>();
                body.put("model", model);
                body.put("messages", anthropicMsgs);
                body.put("stream", streamEnabled);
                body.put("temperature", temperature);
                body.put("max_tokens", 1024);

                WebClient client = liteLlmWebClient.mutate()
                        .baseUrl(gmsBaseUrl + "/api.anthropic.com")
                        .build();

                var spec = client.post()
                        .uri("/v1/messages")
                        .header("x-api-key", apiKey)
                        .header("anthropic-version", "2023-06-01")
                        .bodyValue(body);

                return addAcceptIfStream(spec, streamEnabled)
                        .retrieve()
                        .onStatus(HttpStatusCode::is4xxClientError, r -> map4xxToApiEx(r, "anthropic", model, streamEnabled))
                        .onStatus(HttpStatusCode::is5xxServerError, r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR)))
                        .bodyToFlux(String.class);
            }

            default:
                return Flux.error(new ApiException(ErrorCode.PROVIDER_NOT_FOUND));
        }
    }


    private WebClient.RequestHeadersSpec<?> addAcceptIfStream(WebClient.RequestHeadersSpec<?> spec, boolean stream) {
        return stream ? spec.header(HttpHeaders.ACCEPT, "text/event-stream") : spec;
    }

    /** OpenAI 호환: developer→system, 기타 미인식 role은 user로 다운그레이드 */
    private List<Map<String, String>> normalizeOpenAiMessages(List<Map<String, String>> in) {
        return in.stream().map(m -> {
            String role = Optional.ofNullable(m.get("role")).orElse("user").toLowerCase(Locale.ROOT);
            role = switch (role) {
                case "developer" -> "system";
                case "assistant", "system", "user", "tool" -> role;
                default -> "user";
            };
            return Map.of(
                    "role", role,
                    "content", m.getOrDefault("content", "")
            );
        }).toList();
    }

    /** Anthropic 호환: user/assistant만 허용, 나머지는 user로; content는 [{type:text,text:"..."}] */
    private List<Map<String, Object>> toAnthropicMessages(List<Map<String, String>> messages) {
        return messages.stream().map(m -> {
            String role = Optional.ofNullable(m.get("role")).orElse("user").toLowerCase(Locale.ROOT);
            if (!role.equals("user") && !role.equals("assistant")) role = "user";
            return Map.of(
                    "role", role,
                    "content", List.of(Map.of("type", "text", "text", m.getOrDefault("content", "")))
            );
        }).toList();
    }

    private String mergeMessages(List<Map<String, String>> messages) {
        StringBuilder sb = new StringBuilder();
        for (Map<String, String> msg : messages) {
            sb.append(msg.getOrDefault("content", "")).append("\n");
        }
        return sb.toString().trim();
    }

    /** 4xx 로깅 강화: provider/model/stream 포함 */
    private Mono<? extends Throwable> map4xxToApiEx(ClientResponse response, String provider, String model, boolean stream) {
        return response.bodyToMono(String.class).defaultIfEmpty("")
                .map(body -> {
                    int sc = response.statusCode().value();
                    log.warn("[LLM-4xx] provider={}, model={}, stream={}, status={}, body={}",
                            provider, model, stream, sc, body);
                    return switch (sc) {
                        case 401, 403 -> new ApiException(ErrorCode.INVALID_KEY, body);
                        case 429 -> new ApiException(ErrorCode.RATE_LIMITED, body);
                        default -> new ApiException(ErrorCode.UPSTREAM_ERROR, body);
                    };
                });
    }
}
