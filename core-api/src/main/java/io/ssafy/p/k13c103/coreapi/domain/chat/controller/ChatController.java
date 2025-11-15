package io.ssafy.p.k13c103.coreapi.domain.chat.controller;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import io.ssafy.p.k13c103.coreapi.config.security.CustomMemberDetails;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "채팅 관리 API", description = "채팅 생성, 검색 등 채팅 관련 API를 제공합니다.")
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chats")
public class ChatController {

    private final ChatService chatService;

    @Operation(summary = "채팅 검색", description = "")
    @GetMapping
    public ResponseEntity<JSend> searchByKeywords(@RequestParam(name = "k") List<String> keywords, Pageable pageable, @AuthenticationPrincipal CustomMemberDetails member) {

        Page<ChatResponseDto.SearchedResultInfo> page = chatService.searchByKeywords(keywords, pageable, member.getMemberUid());

        return ResponseEntity.status(HttpStatus.OK).body(JSend.success(page));
    }

    @Operation(summary = "채팅 복사", description = "")
    @PostMapping("/copies")
    public ResponseEntity<JSend> copyChat(@RequestBody ChatRequestDto.CopyChat request, @AuthenticationPrincipal CustomMemberDetails member) {

        ChatResponseDto.CopiedChatInfo copy = chatService.copyChat(request, member.getMemberUid());

        return ResponseEntity.status(HttpStatus.CREATED).body(JSend.success(copy));
    }

}
