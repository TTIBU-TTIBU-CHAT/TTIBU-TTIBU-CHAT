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
        final double temperature = resolveTemperature(model, aiProcessingProperties.getTemperature());

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
                String systemText = messages.stream()
                        .filter(m -> "system".equalsIgnoreCase(m.getOrDefault("role", "")))
                        .map(m -> m.getOrDefault("content", ""))
                        .collect(Collectors.joining("\n")).trim();

                String userText = messages.stream()
                        .filter(m -> !"system".equalsIgnoreCase(m.getOrDefault("role", "")))
                        .map(m -> m.getOrDefault("content", ""))
                        .collect(Collectors.joining("\n")).trim();

                Map<String, Object> body = new HashMap<>();
                body.put("contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", userText))
                )));
                body.put("generationConfig", Map.of("temperature", temperature));
                if (!systemText.isBlank()) {
                    body.put("systemInstruction", Map.of(
                            "parts", List.of(Map.of("text", systemText))
                    ));
                }

                String path = streamEnabled
                        ? "/v1beta/models/{model}:streamGenerateContent"
                        : "/v1beta/models/{model}:generateContent";

                WebClient client = liteLlmWebClient.mutate()
                        .baseUrl(gmsBaseUrl + "/generativelanguage.googleapis.com")
                        .build();

                var spec = client.post()
                        .uri(uriBuilder -> uriBuilder
                                .path(path)
                                .queryParam("key", apiKey)
                                .build(model))
                        .bodyValue(body);

                return addAcceptIfStream(spec, streamEnabled)
                        .retrieve()
                        .onStatus(
                                HttpStatusCode::is4xxClientError,
                                r -> map4xxToApiEx(r, "gemini", model, streamEnabled)
                        )
                        .onStatus(
                                HttpStatusCode::is5xxServerError,
                                r -> Mono.error(new ApiException(ErrorCode.UPSTREAM_ERROR))
                        )
                        .bodyToFlux(String.class)
                        .transform(this::assembleGeminiChunks);
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

    // [수정] Gemini NDJSON 배열을 {…} 객체 단위로 재조립 (문자열/이스케이프 안전)
    private Flux<String> assembleGeminiChunks(Flux<String> flux) {
        final StringBuilder objBuf = new StringBuilder();

        // 람다에서 변경 가능한 상태는 배열 래퍼로 보관
        final boolean[] inObject = { false };   // 현재 {…} 안인지
        final int[]     depth    = { 0 };       // 중괄호 깊이
        final boolean[] inString = { false };   // JSON 문자열 내부인지
        final boolean[] escaped  = { false };   // 직전 문자가 백슬래시(\)인지

        return flux.handle((chunk, sink) -> {
            if (chunk == null || chunk.isEmpty()) return;

            // SSE나 로그에 "data: {...}" 처럼 섞여 오면 앞의 접두어 제거
            String piece = chunk.startsWith("data:") ? chunk.substring(5).trim() : chunk;

            for (int i = 0; i < piece.length(); i++) {
                char ch = piece.charAt(i);

                // 아직 객체 시작 전: 배열 기호/공백/콤마는 건너뛰고 첫 '{'에서 시작
                if (!inObject[0]) {
                    if (ch == '{') {
                        inObject[0] = true;
                        depth[0] = 1;
                        inString[0] = false;
                        escaped[0] = false;
                        objBuf.setLength(0);
                        objBuf.append('{');
                    }
                    // '[', ']', ',', 공백/개행 등은 무시
                    continue;
                }

                // 객체 내부: 문자 추가
                objBuf.append(ch);

                // 문자열/이스케이프 상태 갱신
                if (inString[0]) {
                    if (escaped[0]) {
                        // 방금 이스케이프 처리한 문자였음 → 플래그 해제
                        escaped[0] = false;
                    } else if (ch == '\\') {
                        escaped[0] = true;         // 다음 문자는 이스케이프
                    } else if (ch == '"') {
                        inString[0] = false;       // 문자열 종료
                    }
                    // 문자열 안에서는 중괄호 깊이 계산하지 않음
                    continue;
                } else {
                    if (ch == '"') {
                        inString[0] = true;        // 문자열 시작
                        escaped[0] = false;
                        continue;
                    }
                    // 문자열 밖에서만 깊이 계산
                    if (ch == '{') {
                        depth[0]++;
                    } else if (ch == '}') {
                        depth[0]--;
                        if (depth[0] == 0) {
                            // 완전한 객체 1개 완성
                            String jsonObject = objBuf.toString().trim();
                            if (!jsonObject.isEmpty()) {
                                sink.next(jsonObject);
                            }
                            // 상태 초기화 (다음 객체 대기)
                            objBuf.setLength(0);
                            inObject[0] = false;
                            inString[0] = false;
                            escaped[0]  = false;
                        }
                    }
                }
            }
        });
    }

    private double resolveTemperature(String model, double defaultTemperature) {
        if (model == null) return defaultTemperature;

        String m = model.toLowerCase(Locale.ROOT);

        // gpt-5, gpt-5-mini, gpt-5-nano 모두 포함
        if (m.startsWith("gpt-5")) {
            return 1.0;
        }

        // 나머지는 기존 설정값 그대로
        return defaultTemperature;
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
