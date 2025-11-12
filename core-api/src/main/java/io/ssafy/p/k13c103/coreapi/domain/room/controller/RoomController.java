package io.ssafy.p.k13c103.coreapi.domain.room.controller;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import io.ssafy.p.k13c103.coreapi.config.security.CustomMemberDetails;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.*;
import io.ssafy.p.k13c103.coreapi.domain.room.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Room", description = "채팅방 관련 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/rooms")
public class RoomController {

    private final RoomService roomService;

    @Operation(summary = "새 채팅방 생성 및 첫 질문 등록")
    @PostMapping
    public ResponseEntity<JSend> createRoom(
            @AuthenticationPrincipal CustomMemberDetails member,
            @Valid @RequestBody RoomCreateRequestDto request) {
        Long roomId = roomService.createRoom(member.getMemberUid(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(JSend.success(Map.of(
                "room_id", roomId
        )));
    }

    @Operation(summary="채팅방 리스트 조회", description = "")
    @GetMapping
    public ResponseEntity<JSend> getList(@AuthenticationPrincipal CustomMemberDetails member) {

        List<RoomResponseDto.RoomListInfo> list =  roomService.getList(member.getMemberUid());

        return ResponseEntity.status(HttpStatus.OK).body(JSend.success(list));
    }

    @Operation(summary = "채팅 및 브랜치 정보 저장", description = "")
    @PostMapping(value = "/{roomId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<JSend> saveChatAndBranch(@PathVariable Long roomId, @RequestPart("chatInfo") String chatInfo, @RequestPart("branchView") String branchView, @AuthenticationPrincipal CustomMemberDetails member) {

        RoomResponseDto.ChatBranchInfo info = roomService.saveChatAndBranch(roomId, member.getMemberUid(), chatInfo, branchView);

        return ResponseEntity.status(HttpStatus.CREATED).body(JSend.success(info));
    }

    @Operation(summary = "채팅방 이름 수정", description = "특정 채팅방의 이름을 수정합니다.")
    @PatchMapping("/{roomId}/name")
    public ResponseEntity<JSend> updateRoomName(
            @AuthenticationPrincipal CustomMemberDetails member,
            @PathVariable Long roomId,
            @Valid @RequestBody RoomRenameRequestDto request
    ) {
        RoomRenameResponseDto response = roomService.updateRoomName(member.getMemberUid(), roomId, request);
        return ResponseEntity.ok(JSend.success(response));
    }

    @Operation(summary = " 채팅방 삭제", description = "")
    @DeleteMapping("/{roomId}")
    public ResponseEntity<JSend> delete(@PathVariable Long roomId, @AuthenticationPrincipal CustomMemberDetails member) {

        roomService.delete(roomId, member.getMemberUid());

        return ResponseEntity.status(HttpStatus.OK).body(JSend.success("채팅방 삭제 완료"));
    }

    @Operation(summary = "기존 Room에 새 채팅 생성", description = "기존 채팅방 내 특정 노드(parent_id)에 새 질문을 추가합니다.")
    @PostMapping("/{roomId}/chats")
    public ResponseEntity<JSend> createChatInRoom(
            @AuthenticationPrincipal CustomMemberDetails member,
            @PathVariable Long roomId,
            @Valid @RequestBody ChatCreateRequestDto request
    ) {
        ChatCreateResponseDto response = roomService.createChatInRoom(member.getMemberUid(), roomId, request);
        return ResponseEntity.ok(JSend.success(response));
    }

}
