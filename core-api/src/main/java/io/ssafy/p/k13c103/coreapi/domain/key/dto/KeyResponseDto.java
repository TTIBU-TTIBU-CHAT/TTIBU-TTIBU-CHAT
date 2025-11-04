package io.ssafy.p.k13c103.coreapi.domain.key.dto;

import lombok.Builder;

import java.time.LocalDate;

public class KeyResponseDto {

    /**
     * 키 등록 응답 DTO
     */
    @Builder
    public record RegisteredKeyInfo(
            Long keyUid
    ) {
    }

    /**
     * 키 수정 응답 DTO
     */
    @Builder
    public record EditKeyInfo(
            Long keyUid
    ) {
    }

    /**
     * 키 조회 응답 DTO
     */
    @Builder
    public record GetKeyInfo(
            Long keyUid,
            String provider,
            String key, // 복호화한 키
            Boolean isActive,
            LocalDate expirationAt

    ) {
    }
}