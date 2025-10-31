package io.ssafy.p.k13c103.coreapi.domain.member;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class MemberRequestDto {

    /**
     * 회원가입 요청 DTO
     */
    public record RegisterMember(
            @NotBlank(message = "비밀번호는 필수 입력 값입니다.")
            @Email(message = "이메일 형식이 올바르지 않습니다.")
            String email,

            @NotBlank(message = "비밀번호는 필수 입력 값입니다.")
            String password,

            @NotBlank(message = "이름은 필수 입력 값입니다.")
            String name
    ) {}
}