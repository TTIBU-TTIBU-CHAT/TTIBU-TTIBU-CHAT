package io.ssafy.p.k13c103.coreapi.domain.group.controller;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import io.ssafy.p.k13c103.coreapi.config.security.CustomMemberDetails;
import io.ssafy.p.k13c103.coreapi.domain.group.dto.GroupCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.group.dto.GroupResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.group.dto.GroupUpdateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.group.service.GroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Group", description = "그룹 관련 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/groups")
public class GroupController {

    private final GroupService groupService;

    @Operation(summary = "그룹 생성", description = "선택된 채팅 노드들을 기반으로 새 그룹을 생성합니다.")
    @PostMapping
    public ResponseEntity<JSend> createGroup(
            @AuthenticationPrincipal CustomMemberDetails member,
            @Valid @RequestBody GroupCreateRequestDto request) {
        GroupResponseDto response = groupService.createGroup(member.getMemberUid(), request);
        return ResponseEntity.ok(JSend.success(response));
    }

    @Operation(summary = "그룹 수정", description = "그룹의 이름, 포함된 채팅 노드, 요약 재생성 여부를 수정합니다.")
    @PatchMapping("/{groupId}")
    public ResponseEntity<JSend> updateGroup(
            @PathVariable Long groupId,
            @Valid @RequestBody GroupUpdateRequestDto request,
            @AuthenticationPrincipal CustomMemberDetails member) {
        GroupResponseDto response = groupService.updateGroup(groupId, request);
        return ResponseEntity.ok(JSend.success(response));
    }
}
