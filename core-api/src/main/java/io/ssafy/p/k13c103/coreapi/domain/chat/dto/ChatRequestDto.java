package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

public class ChatRequestDto {

    /**
     * 채팅 복사 요청 DTO
     */
    public record CopyChat(
            Long originUid, // 기존 채팅 아이디
            Long roomUid // 붙여넣기 할 채팅방 아이디
    ) {
    }
}