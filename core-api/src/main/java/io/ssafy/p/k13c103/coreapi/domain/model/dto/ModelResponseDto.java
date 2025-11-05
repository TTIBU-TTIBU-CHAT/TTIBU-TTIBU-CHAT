package io.ssafy.p.k13c103.coreapi.domain.model.dto;

import lombok.Builder;

import java.util.List;

public class ModelResponseDto {

    @Builder
    public record ModelListInfo(
            String provider,
            List<ModelInfoDetail> modelList
    ) {
    }

    @Builder
    public record ModelInfoDetail(
            String name,
            String provider,
            String code,
            boolean isSelected, // 사용자의 선택 여부
            boolean isDefault // 디폴트 여부
    ) {
    }
}