package io.ssafy.p.k13c103.coreapi.chat.dto;

import io.ssafy.p.k13c103.coreapi.chat.enums.ChatSseEventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class ChatSseEvent<T> {

    private ChatSseEventType type;  // SSE 이벤트 타입

    private T data;                 // 페이로드 (제네릭: 생성, 업데이트, 삭제 등 상황에 따른 다양한 DTO를 유연하게 담기 위함)
}
