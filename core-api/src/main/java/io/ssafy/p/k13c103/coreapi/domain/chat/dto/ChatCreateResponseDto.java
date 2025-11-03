package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
@Builder
@Slf4j
public class ChatCreateResponseDto {

    private Long chatId;                // 채팅 아이디

    private Long roomId;                // 채팅방 아이디

    private Long branchId;              // 브랜치 아이디

    private String branchName;          // 브랜치 이름

    private String question;            // 사용자 질문

    private String answer;              // 답변

    private String summary;             // 내용 요약 (nullable)

    private List<String> keywords;      // 키워드 목록 (nullable)

    private LocalDateTime createdAt;    // 생성일시

    public static ChatCreateResponseDto from(Chat chat) {
        ObjectMapper mapper = new ObjectMapper();
        List<String> keywordsList = List.of();

        try {
            if (chat.getKeyword() != null && !chat.getKeyword().isBlank()) {
                keywordsList = mapper.readValue(chat.getKeyword(), new TypeReference<List<String>>() {});
            }
        } catch (Exception e) {
            log.warn("[WARN] Keyword JSON parsing failed for chatId {}: {}", chat.getChatUid(), e.getMessage());
        }

        return ChatCreateResponseDto.builder()
                .chatId(chat.getChatUid())
                .roomId(chat.getBranch().getRoom().getRoomUid())
                .branchId(chat.getBranch().getBranchUid())
                .branchName(chat.getBranch().getName())
                .question(chat.getQuestion())
                .answer(chat.getAnswer())
                .summary(chat.getSummary())
                .keywords(keywordsList)
                .createdAt(chat.getCreatedAt())
                .build();
    }
}
