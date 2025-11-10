package io.ssafy.p.k13c103.coreapi.domain.group.controller;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import io.ssafy.p.k13c103.coreapi.config.security.CustomMemberDetails;
import io.ssafy.p.k13c103.coreapi.domain.group.service.GroupViewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@Tag(name = "GroupView", description = "그룹 뷰 JSON 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/groups/view")
public class GroupViewController {

    private final GroupViewService groupViewService;

    @Operation(
            summary = "그룹 뷰 전체 갱신",
            description = "프론트엔드에서 전달한 그룹 뷰 JSON을 그대로 덮어씁니다. "
                    + "요청 바디의 형식은 자유롭고, 서버는 전체 JSON을 그대로 저장합니다."
    )
    @PatchMapping
    public ResponseEntity<JSend> updateGroupView(
            @AuthenticationPrincipal CustomMemberDetails member,
            @RequestBody String contentJson) {

        groupViewService.updateGroupView(member.getMemberUid(), contentJson);

        Map<String, Object> response = Map.of("updated_at", LocalDateTime.now());
        return ResponseEntity.ok(JSend.success(response));
    }

    @Operation(summary = "그룹 뷰 조회", description = "로그인한 사용자의 그룹 뷰 JSON을 그대로 반환합니다.")
    @GetMapping
    public ResponseEntity<JSend> getGroupView(
            @AuthenticationPrincipal CustomMemberDetails member) {

        String json = groupViewService.getGroupView(member.getMemberUid());
        return ResponseEntity.ok(JSend.success(json));
    }
}
