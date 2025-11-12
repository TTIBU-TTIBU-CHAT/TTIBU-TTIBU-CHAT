package io.ssafy.p.k13c103.coreapi.domain.room.dto;

import lombok.Builder;

import java.time.LocalDateTime;

public class RoomResponseDto {

    /**
     * 채팅방 리스트 조회 응답 DTO
     */
    @Builder
    public record RoomListInfo(
            Long roomUid,
            String name,
            String summary,
            LocalDateTime updatedAt
    ) {
    }

    /**
     * 채팅 브랜치 저장 응답 DTO
     */
    @Builder
    public record ChatBranchInfo(
            Long roomUid,
            LocalDateTime updatedAt
    ) {
    }
}
