package io.ssafy.p.k13c103.coreapi.domain.model.dto;

import lombok.Builder;

import java.util.List;

public class ModelResponseDto {

    @Builder
    public record ModelListInfo(
            String providerCode,
            List<ModelInfoDetail> modelList
    ) {
    }

    @Builder
    public record ModelInfoDetail(
            Long modelCatalogUid,
            String modelName, // 표시용 이름
            String modelCode, // 식별용 이름
            boolean isSelected, // 사용자의 선택 여부
            boolean isDefault // 디폴트 여부
    ) {
    }

    @Builder
    public record ProviderListInfo(
            Long providerUid,
            String providerCode
    ) {
    }
}