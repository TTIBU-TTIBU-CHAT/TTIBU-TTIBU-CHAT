package io.ssafy.p.k13c103.coreapi.domain.key.controller;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import io.ssafy.p.k13c103.coreapi.config.security.CustomMemberDetails;
import io.ssafy.p.k13c103.coreapi.domain.key.dto.KeyRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.key.dto.KeyResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.key.service.KeyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "키 관리 API", description = "키 등록, 상태 관리 등 키 관련 API를 제공합니다.")
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/keys")
public class KeyController {

    private final KeyService keyService;

    @Operation(summary = "키 등록", description = "")
    @PostMapping
    public ResponseEntity<JSend> register(@RequestBody KeyRequestDto.RegisterKey request, @AuthenticationPrincipal CustomMemberDetails member) {

        KeyResponseDto.RegisteredKeyInfo info = keyService.register(member.getMemberUid(), request);

        return ResponseEntity.status(HttpStatus.CREATED).body(JSend.success(info));
    }

    @Operation(summary = "키 수정", description = "")
    @PutMapping
    public ResponseEntity<JSend> edit(@RequestBody KeyRequestDto.EditKey request, @AuthenticationPrincipal CustomMemberDetails member) {

        KeyResponseDto.EditedKeyInfo info = keyService.edit(member.getMemberUid(), request);

        return ResponseEntity.status(HttpStatus.OK).body(JSend.success(info));
    }

    @Operation(summary = "키 삭제", description = "")
    @DeleteMapping("/{keyUid}")
    public ResponseEntity<JSend> delete(@PathVariable Long keyUid, @AuthenticationPrincipal CustomMemberDetails member) {

        keyService.delete(member.getMemberUid(), keyUid);

        return ResponseEntity.status(HttpStatus.OK).body(JSend.success("키 삭제 완료"));
    }

    @Operation(summary = "키 단일 조회", description = "")
    @GetMapping("/{keyUid}")
    public ResponseEntity<JSend> getOne(@PathVariable Long keyUid, @AuthenticationPrincipal CustomMemberDetails member) {

        KeyResponseDto.KeyInfo info = keyService.getOne(member.getMemberUid(), keyUid);

        return ResponseEntity.status(HttpStatus.OK).body(JSend.success(info));
    }

}
