package io.ssafy.p.k13c103.coreapi.domain.chat.controller;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import io.ssafy.p.k13c103.coreapi.config.security.CustomMemberDetails;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
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


@Tag(name = "Chat API", description = "채팅 생성 및 AI 답변/요약 처리 관련 API")
@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/v1/chats")
public class ChatController {

    private final ChatService chatService;

    @Operation(
            summary = "새 채팅 생성",
            description = """
                    새로운 질문(Chat)을 등록하고 AI 비동기 처리를 시작합니다.  
                    요청이 완료되면 다음 단계를 순서대로 수행합니다:
                    
                    1️⃣ Chat 생성 및 DB 저장  
                    2️⃣ SSE로 `CHAT_CREATED` 이벤트 전송  
                    3️⃣ (비동기) LiteLLM 호출 → AI 답변 생성 후 `CHAT_ANSWERED` 전송  
                    4️⃣ (비동기) FastAPI 호출 → 요약·키워드 생성 후 `CHAT_SUMMARIZED` 전송  
                    """,
            responses = {
                    @ApiResponse(responseCode = "201", description = "채팅 생성 성공",
                            content = @Content(schema = @Schema(implementation = ChatCreateResponseDto.class),
                                    examples = @ExampleObject(value = """
                                            {
                                              "status": "success",
                                              "data": {
                                                "chatUid": 12,
                                                "question": "이번 프로젝트의 핵심 기능은 뭐야?",
                                                "answer": null,
                                                "summary": null,
                                                "keywords": null,
                                                "branchId": 5,
                                                "createdAt": "2025-11-03T17:30:00"
                                              }
                                            }
                                            """))),
                    @ApiResponse(responseCode = "401", description = "인증 실패 (Authorization 헤더 누락)"),
                    @ApiResponse(responseCode = "404", description = "Room 또는 Branch를 찾을 수 없음"),
                    @ApiResponse(responseCode = "500", description = "서버 내부 오류")
            }
    )
    @PostMapping
    public ResponseEntity<JSend> createChat(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "질문 내용을 담은 요청 DTO",
                    required = true,
                    content = @Content(schema = @Schema(implementation = ChatCreateRequestDto.class),
                            examples = @ExampleObject(value = """
                                    {
                                      "roomId": 3,
                                      "branchId": null,
                                      "branchName": null,
                                      "question": "이번 기능의 개선 방향은 뭐야?",
                                      "parentId": null,
                                      "modelId": 1
                                    }
                                    """)))
            @Valid @RequestBody ChatCreateRequestDto request,
            @Parameter(hidden = true) @AuthenticationPrincipal CustomMemberDetails member) {
        ChatCreateResponseDto response = chatService.createChat(request, member.getMemberUid());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(JSend.success(response));
    }
}
