package io.ssafy.p.k13c103.coreapi.domain.member.service;

import io.ssafy.p.k13c103.coreapi.domain.member.dto.MemberRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.member.dto.MemberResponseDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public interface MemberService {
    MemberResponseDto.RegisteredMemberInfo register(MemberRequestDto.RegisterMember registerMember);

    MemberResponseDto.MemberInfo login(MemberRequestDto.LoginMember loginMember, HttpServletRequest request, HttpServletResponse response);

    void logout(HttpServletRequest request, HttpServletResponse response);
}