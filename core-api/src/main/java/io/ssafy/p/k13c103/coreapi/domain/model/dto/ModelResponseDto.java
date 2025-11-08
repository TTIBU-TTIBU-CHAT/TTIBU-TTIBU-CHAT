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
            List<ModelDetailInfo> modelList
    ) {
    }

    /**
     * 모델 상세 조회 응답 DTO
     */
    @Builder
    public record ModelDetailInfo(
            Long modelCatalogUid,
            String modelName, // 표시용 이름
            String modelCode, // 식별용 이름
            boolean isSelected, // 사용자의 선택 여부
            boolean isDefault // 디폴트 여부
    ) {
    }

    /**
     * 채팅 내 사용 모델 옵션 조회 응답 DTO
     */
    @Builder
    public record ModelOptionList(
            Long modelUid,
            String modelName,
            String modelCode,
            boolean isDefault
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