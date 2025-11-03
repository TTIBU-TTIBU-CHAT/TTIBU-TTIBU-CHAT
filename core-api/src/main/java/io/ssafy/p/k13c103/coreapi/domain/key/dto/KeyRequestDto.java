package io.ssafy.p.k13c103.coreapi.domain.key.dto;

import java.time.LocalDate;

public class KeyRequestDto {

    /**
     * 키 등록 요청 DTO
     */
    public record RegisterKey(
            String provider,
            String key,
            Boolean isActive,
            LocalDate expirationAt
    ) {
    }
}