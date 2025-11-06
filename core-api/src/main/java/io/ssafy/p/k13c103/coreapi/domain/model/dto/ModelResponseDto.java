package io.ssafy.p.k13c103.coreapi.domain.model.dto;

import lombok.Builder;

import java.util.List;

public class ModelResponseDto {

    /**
     * 모델 리스트 조회 응답 DTO
     */
    @Builder
    public record ModelListInfo(
            String providerCode,
            List<ModelInfoDetail> modelList
    ) {
    }

    /**
     * 모델 상세 조회 응답 DTO
     */
    @Builder
    public record ModelInfoDetail(
            Long modelCatalogUid,
            String modelName, // 표시용 이름
            String modelCode, // 식별용 이름
            boolean isSelected, // 사용자의 선택 여부
            boolean isDefault // 디폴트 여부
    ) {
    }

    /**
     * 제공사 리스트 조회 응답 DTO
     */
    @Builder
    public record ProviderListInfo(
            Long providerUid,
            String providerCode
    ) {
    }
}