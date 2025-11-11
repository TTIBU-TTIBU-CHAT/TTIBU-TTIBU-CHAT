package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import java.time.LocalDate;
import java.util.List;

public class ChatResponseDto {

    /**
     * 채팅 검색 응답 DTO
     */
    public record SearchedResultInfo(
            Long chatUid, // originId
            String question,
            String answer,
            String summary,
            List<String> keywords,
            LocalDate questionedAt, // 질문
            LocalDate answeredAt, // 답변
            LocalDate updatedAt, // 요약, 키워드
            Long modelUid // 사용 모델
    ) {
    }
}