package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatSseEventType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Schema(description = "SSE 이벤트 전송 DTO")
@Getter
@AllArgsConstructor
@Builder
public class ChatSseEvent<T> {

    @Schema(description = "SSE 이벤트 타입", example = "CHAT_CREATED")
    private ChatSseEventType type;

    @Schema(description = "전송 데이터 (제네릭 타입: 상황에 따라 ChatCreateResponseDto 등)", example = "{...}")
    private T data;
}
