package io.ssafy.p.k13c103.coreapi.domain.chat.controller;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import io.ssafy.p.k13c103.coreapi.config.security.CustomMemberDetails;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/v1/chats")
public class ChatController {

    private final ChatService chatService;

    /**
     * 1. Chat 생성 및 DB 저장
     * 2. SSE: CHAT_CREATED 전송
     * 3. (비동기) LiteLLM 서버 호출 -> 답변 저장 -> SSE: CHAT_ANSWERED
     * 4. (비동기) FastAPI 호출 -> 요약/키워드 저장 -> SSE: CHAT_SUMMARIZED
     */
    @PostMapping
    public ResponseEntity<JSend> createChat(@Valid @RequestBody ChatCreateRequestDto request,
                                            @AuthenticationPrincipal CustomMemberDetails member) {
        ChatCreateResponseDto response = chatService.createChat(request, member.getMemberUid());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(JSend.success(response));
    }
}
