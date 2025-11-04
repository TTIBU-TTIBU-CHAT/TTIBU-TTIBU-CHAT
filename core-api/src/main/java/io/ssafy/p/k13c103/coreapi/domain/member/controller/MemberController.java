package io.ssafy.p.k13c103.coreapi.domain.member.controller;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import io.ssafy.p.k13c103.coreapi.domain.member.MemberRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.member.MemberResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.member.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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

    @Operation(summary = "로그인", description = "")
    @PostMapping("/login")
    public ResponseEntity<JSend> login(@RequestBody MemberRequestDto.LoginMember loginMember, HttpServletRequest request, HttpServletResponse response) {

        MemberResponseDto.MemberInfo member = memberService.login(loginMember, request, response);

        return ResponseEntity.status(HttpStatus.OK).body(JSend.success(member));
    }

    @Operation(summary = "로그아웃", description = "")
    @PostMapping("/logout")
    public ResponseEntity<JSend> logout(HttpServletRequest request, HttpServletResponse response) {

        memberService.logout(request, response);

        return ResponseEntity.status(HttpStatus.OK).body(JSend.success("로그아웃 완료"));
    }

    @Operation(summary = "csrf 토큰 발급", description = "")
    @GetMapping("/csrf")
    public Map<String, String> getCsrfToken(CsrfToken token) {
        return Map.of("token", token.getToken());
    }
}
