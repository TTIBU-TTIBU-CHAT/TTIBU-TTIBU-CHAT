package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import lombok.Builder;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
public class ChatResponseDto {

    private static final ObjectMapper mapper = new ObjectMapper();

    /**
     * 채팅 검색 응답 DTO
     */
    public record SearchedResultInfo(
            Long chatUid, // originId
            String question,
            String answer,
            String summary,
            List<String> keywords,
            LocalDateTime questionedAt, // 질문
            LocalDateTime answeredAt, // 답변
            LocalDateTime updatedAt, // 요약, 키워드
            Long modelUid // 사용 모델
    ) {

        public SearchedResultInfo(Chat chat) {
            this(
                    chat.getChatUid(),
                    chat.getQuestion(),
                    chat.getAnswer(),
                    chat.getSummary(),
                    parseKeywords(chat.getKeywords()),
                    chat.getCreatedAt(),
                    chat.getAnsweredAt(),
                    chat.getUpdatedAt(),
                    chat.getModelCatalog().getModelUid()
            );
        }

        private static List<String> parseKeywords(String keywords) {
            if (keywords == null || keywords.isBlank())
                return List.of();
            try {
                return mapper.readValue(keywords, new TypeReference<>() {});
            } catch(Exception e){
                log.warn("[parseKeywords in ChatResponseDto] JSON 파싱 실패");
                return List.of();
            }
        }
    }


    /**
     * 채팅 복사 응답 DTO
     */
    @Builder
    public record CopiedChatInfo(
            Long roomUid, // 붙여넣기 된 채팅방 아이디
            Long copyId // 새로 생성된 채팅 아이디
    ) {
    }
}