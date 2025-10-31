package io.ssafy.p.k13c103.coreapi.domain.member;

public interface MemberService {
    MemberResponseDto.RegisteredMemberInfo register(MemberRequestDto.RegisterMember registerMember);
}