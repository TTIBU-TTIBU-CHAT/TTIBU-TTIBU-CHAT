package io.ssafy.p.k13c103.coreapi.domain.key.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

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
            String providerCode,
            String key, // 복호화한 키
            Boolean isActive,
            LocalDate expirationAt

    ) {
    }

    /**
     * 키 리스트 조회 응답 DTO
     */
    @Builder
    public record GetKeyShortInfo(
            Long keyUid,
            String provider,
            Boolean isActive
    ) {
    }

    /**
     * 토큰 사용량 조회 DTO
     */
    @Builder
    public record TokenInfo(
            Integer totalToken,
            List<TokenDetailInfo> tokenList
    ) {
    }

    /**
     * 토큰 사용량 상세 조회 DTO
     */
    @Builder
    public record TokenDetailInfo(
            String provider,
            Integer token
    ) {
    }
}