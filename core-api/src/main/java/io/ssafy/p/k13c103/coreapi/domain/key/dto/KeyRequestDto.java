package io.ssafy.p.k13c103.coreapi.domain.key.dto;

import java.time.LocalDate;

public class KeyRequestDto {

    /**
     * 키 등록 요청 DTO
     */
    public record RegisterKey(
            Long providerUid,
            String key,
            Boolean isActive,
            LocalDate expirationAt
    ) {
    }

    /**
     * 키 수정 요청 DTO
     */
    public record EditKey(
            Long keyUid,
            Long providerUid,
            String key,
            Boolean isActive,
            LocalDate expirationAt
    ) {
    }
}