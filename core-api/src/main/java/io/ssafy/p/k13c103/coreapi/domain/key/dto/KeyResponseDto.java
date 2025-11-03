package io.ssafy.p.k13c103.coreapi.domain.key.dto;

import lombok.Builder;

public class KeyResponseDto {

    /**
     * 키 등록 응답 DTO
     */
    @Builder
    public record RegisteredKeyInfo(
            Long keyUid
    ) {
    }
}