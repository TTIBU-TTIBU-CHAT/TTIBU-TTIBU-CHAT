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
    public String extractDeltaContent(String chunk) {
        try {
            if (chunk == null || chunk.isBlank()) return null;
            if (chunk.contains("[DONE]")) return null;

            JsonNode root = objectMapper.readTree(chunk);

            // LiteLLM || OpenAI 스타일
            if (root.has("choices")) {
                JsonNode choices = root.get("choices");
                if (choices.isArray() && !choices.isEmpty()) {
                    JsonNode delta = choices.get(0).get("delta");
                    if (delta != null && delta.has("content")) {
                        return delta.get("content").asText();
                    }
                }
            }

            // Anthropic(Claude) 스타일
            if (root.has("type") && root.get("type").asText().equals("content_block_delta")) {
                return root.get("delta").get("text").asText();
            }

            // Gemini 스타일
            if (root.has("candidates")) {
                JsonNode parts = root.path("candidates").get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty() && parts.get(0).has("text")) {
                    return parts.get(0).get("text").asText();
                }
            }
        } catch (Exception e) {
            log.debug("[LlmStreamParser] content 파싱 실패: {}", e.getMessage());
        }

        return null;
    }

    /**
     * Chunk가 [DONE] 종료 신호인지 여부
     */
    public boolean isDoneChunk(String chunk) {
        if (chunk == null) return false;
        return chunk.trim().equals("[DONE]")
                || chunk.trim().equalsIgnoreCase("data: [DONE]");
    }

    /**
     * Chunk에서 토큰 사용량 관련 데이터 추출
     */
    public String extractUsage(String chunk) {
        try {
            if (chunk == null || chunk.isBlank()) return null;
            JsonNode root = objectMapper.readTree(chunk);

            if (root.has("usage")) {
                return root.get("usage").toString();
            }
        } catch (Exception e) {
            log.debug("[LlmStreamParser] usage 파싱 실패: {}", e.getMessage());
        }

        return null;
    }
}
