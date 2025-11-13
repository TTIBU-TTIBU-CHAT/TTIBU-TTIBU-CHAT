package io.ssafy.p.k13c103.coreapi.domain.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class LlmStreamParser {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Chunk에서 content(답변 텍스트) 부분만 추출
     */
    public String extractDeltaContent(String provider, String chunk) {
        if (chunk == null || chunk.isBlank()) return null;

        String p = normalizeProvider(provider);

        try {
            String json = normalizeJson(chunk);
            JsonNode root = safeParse(json);
            if (root == null) return null;

            /* 1) OpenAI / GPT-4 / GPT-5 / LiteLLM → choices[0].delta.content */
            if (p.equals("openai") || p.equals("litellm")) {
                JsonNode choices = root.path("choices");
                if (choices.isArray() && !choices.isEmpty()) {
                    JsonNode delta = choices.get(0).path("delta");
                    if (delta != null && delta.has("content")) {
                        return delta.get("content").asText();
                    }
                }
            }

            /* 2) Claude / Anthropic → type: content_block_delta, delta.text */
            if (p.equals("anthropic") || p.equals("claude")) {
                if (root.has("type")
                        && "content_block_delta".equals(root.get("type").asText())) {

                    JsonNode delta = root.path("delta");
                    if (delta.has("text")) {
                        return delta.get("text").asText();
                    }
                }
            }

            /* 3) Gemini / Google → candidates[0].content.parts[n].text */
            if (p.equals("gemini") || p.equals("google")) {
                JsonNode parts = root
                        .path("candidates").path(0)
                        .path("content").path("parts");

                if (parts.isArray() && !parts.isEmpty()) {
                    JsonNode t = parts.get(0).path("text");
                    if (t.isTextual()) return t.asText();
                }
            }
        } catch (Exception e) {
            log.warn("[Parser] extractDeltaContent 오류 provider={}, err={}, chunk={}",
                    provider, e.getMessage(), chunk);
        }

        return null;
    }

    /**
     * Chunk가 [DONE] 종료 신호인지 여부
     */
    public boolean isDoneChunk(String provider, String chunk) {
        if (chunk == null) return false;

        String p = normalizeProvider(provider);
        String c = chunk.trim();

        try {
             /* 1) OpenAI / GPT-4 / GPT-5 / LiteLLM → "[DONE]" */
            if (p.equals("openai") || p.equals("litellm")) {
                return c.equals("[DONE]") || c.equalsIgnoreCase("data: [DONE]");
            }

            /* 2) Gemini / Google → finishReason: "STOP" */
            if (p.equals("gemini") || p.equals("google")) {
                String json = normalizeJson(c);
                JsonNode root = safeParse(json);
                if (root == null) return false;

                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    String reason = candidates.get(0).path("finishReason").asText("");
                    return reason.equalsIgnoreCase("STOP")
                            || reason.equalsIgnoreCase("MAX_TOKENS")
                            || reason.equalsIgnoreCase("SAFETY");
                }
                return false;
            }

            /* 3) Claude / Anthropic → type = "message_stop" */
            if (p.equals("anthropic") || p.equals("claude")) {
                String json = normalizeJson(c);
                JsonNode root = safeParse(json);
                if (root == null) return false;

                return "message_stop".equals(root.path("type").asText(""));
            }

        } catch (Exception e) {
            log.warn("[Parser] isDoneChunk 파싱 오류 provider={}, chunk={}, err={}",
                    provider, chunk, e.getMessage());
        }

        return false;
    }

    /**
     * usage 추출 (OpenAI, LiteLLM 등이 제공)
     */
    public JsonNode extractUsage(String provider, String chunk) {
        if (chunk == null || chunk.isBlank()) return null;

        try {
            String json = normalizeJson(chunk);
            JsonNode root = safeParse(json);
            if (root == null) return null;

            if (root.has("usage")) return root.get("usage");

        } catch (Exception e) {
            log.warn("[Parser] usage 파싱 실패 provider={}", provider);
        }
        return null;
    }

    /* 안전한 JSON 파싱 */
    private JsonNode safeParse(String raw) {
        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            log.debug("[Parser] safeParse 실패: {}", e.getMessage());
            return null;
        }
    }

    private String normalizeProvider(String provider) {
        if (provider == null) return "";
        return provider.toLowerCase().trim();
    }

    private String normalizeJson(String raw) {
        String json = raw.trim();
        if (json.startsWith("data:")) {
            json = json.substring(5).trim();
        }
        return json;
    }
}
