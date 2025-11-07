package io.ssafy.p.k13c103.coreapi.domain.model.dto;

public class ModelRequestDto {

    /**
     * 사용 모델 다중 선택 요청 DTO
     */
    public record SelectModel(
            Long modelCatalogUid,
            boolean isSelected // 사용자의 선택 여부
    ) {
    }
}