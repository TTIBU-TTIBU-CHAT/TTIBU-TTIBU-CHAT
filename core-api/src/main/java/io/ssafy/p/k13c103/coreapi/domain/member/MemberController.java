package io.ssafy.p.k13c103.coreapi.domain.member;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "회원 관리 API", description = "로그인, 로그아웃 등 회원 관련 API를 제공합니다.")
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/members")
public class MemberController {

    private final MemberService memberService;

    @Operation(summary = "회원가입", description = "")
    @PostMapping
    public ResponseEntity<JSend> register(@RequestBody MemberRequestDto.RegisterMember registerMember) {

        MemberResponseDto.RegisteredMemberInfo info = memberService.register(registerMember);

        return ResponseEntity.status(HttpStatus.CREATED).body(JSend.success(info));

    }

    @Operation(summary = "csrf 토큰 발급", description = "")
    @GetMapping("/csrf")
    public Map<String, String> getCsrfToken(CsrfToken token) {
        return Map.of("token", token.getToken());
    }
}
