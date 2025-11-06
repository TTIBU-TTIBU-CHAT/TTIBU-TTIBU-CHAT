package io.ssafy.p.k13c103.coreapi.domain.model.controller;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import io.ssafy.p.k13c103.coreapi.domain.model.dto.ModelResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.model.service.ModelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "모델 관리 API", description = "제공사 리스트 조회, 사용 모델 선택 등 모델 관련 API를 제공합니다.")
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/models")
public class ModelController {

    private final ModelService modelService;

    @Operation(summary = "제공사 리스트 조회", description = "")
    @GetMapping("/providers")
    public ResponseEntity<JSend> getProviders() {

        List<ModelResponseDto.ProviderListInfo> providers = modelService.getProviders();

        return ResponseEntity.status(HttpStatus.OK).body(JSend.success(providers));
    }
}