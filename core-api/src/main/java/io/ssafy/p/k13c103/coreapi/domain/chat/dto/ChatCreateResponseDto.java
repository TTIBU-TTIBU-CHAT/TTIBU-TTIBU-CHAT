package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "채팅 생성 응답 DTO")
@Getter
@AllArgsConstructor
@Builder
@Slf4j
public class ChatCreateResponseDto {

    @Schema(description = "채팅 ID", example = "27")
    private Long chatId;

    @Schema(description = "채팅방 ID", example = "3")
    private Long roomId;

    @Schema(description = "브랜치 ID", example = "5")
    private Long branchId;

    @Schema(description = "브랜치 이름", example = "프로젝트 회의")
    private String branchName;

    @Schema(description = "사용자 질문", example = "AI 기반 서비스 아키텍처를 어떻게 구성하면 좋을까?")
    private String question;

    @Schema(description = "AI 답변", example = "모듈화를 통해 비즈니스 로직을 분리하고 비동기 처리를 적용하면 효율적입니다.")
    private String answer;

    @Schema(description = "요약 내용", example = "AI 서비스 아키텍처 설계 핵심 요약", nullable = true)
    private String summary;

    @Schema(description = "추출된 키워드 목록", example = "[\"AI\", \"비동기\", \"서비스 구조\"]", nullable = true)
    private List<String> keywords;

    @Schema(description = "채팅 생성 시각", example = "2025-11-03T14:32:00")
    private LocalDateTime createdAt;

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
