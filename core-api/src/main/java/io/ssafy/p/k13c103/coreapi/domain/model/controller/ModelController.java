package io.ssafy.p.k13c103.coreapi.domain.model.controller;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import io.ssafy.p.k13c103.coreapi.config.security.CustomMemberDetails;
import io.ssafy.p.k13c103.coreapi.domain.model.dto.ModelRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.model.dto.ModelResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.model.service.ModelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "모델 관리 API", description = "제공사 리스트 조회, 사용 모델 선택 등 모델 관련 API를 제공합니다.")
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/models")
public class ModelController {

    private final ModelService modelService;

    @Operation(summary = "사용 모델 다중 선택", description = "")
    @PostMapping
    public ResponseEntity<JSend> select(@RequestBody List<ModelRequestDto.SelectModel> request, @AuthenticationPrincipal CustomMemberDetails member) {

        modelService.select(request, member.getMemberUid());

        return ResponseEntity.status(HttpStatus.CREATED).body(JSend.success("사용 모델 갱신 완료"));
    }

    @Operation(summary = "디폴트 모델 선택", description = "")
    @PatchMapping("/{modelId}")
    public ResponseEntity<JSend> setDefault(@PathVariable Long modelId, @AuthenticationPrincipal CustomMemberDetails member) {

        modelService.setDefault(member.getMemberUid(), modelId);

        return ResponseEntity.status(HttpStatus.CREATED).body(JSend.success("디폴트 모델 갱신 완료"));
    }

    @Operation(summary = "채팅 내 사용 모델 옵션 조회", description = "")
    @GetMapping
    public ResponseEntity<JSend> getOptions(@AuthenticationPrincipal CustomMemberDetails member) {

        List<ModelResponseDto.ModelOptionList> options = modelService.getOptions(member.getMemberUid());

        return ResponseEntity.status(HttpStatus.OK).body(JSend.success(options));
    }

    @Operation(summary = "제공사 리스트 조회", description = "")
    @GetMapping("/providers")
    public ResponseEntity<JSend> getProviders() {

        List<ModelResponseDto.ProviderListInfo> providers = modelService.getProviders();

        return ResponseEntity.status(HttpStatus.OK).body(JSend.success(providers));
    }
}