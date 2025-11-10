package io.ssafy.p.k13c103.coreapi.domain.room.controller;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import io.ssafy.p.k13c103.coreapi.config.security.CustomMemberDetails;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomRenameRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomRenameResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.room.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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

}
