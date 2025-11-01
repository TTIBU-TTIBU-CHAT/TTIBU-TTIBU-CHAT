package io.ssafy.p.k13c103.coreapi.domain.member;

import lombok.Builder;

public class MemberResponseDto {

    /**
     * 회원가입 응답 DTO
     */
    @Builder
    public record RegisteredMemberInfo(
            Long memberUid
    ) {
    }

    /**
     * 로그인 응답 DTO
     */
    @Builder
    public record MemberInfo(
            String email,
            String name
    ) {
    }
}