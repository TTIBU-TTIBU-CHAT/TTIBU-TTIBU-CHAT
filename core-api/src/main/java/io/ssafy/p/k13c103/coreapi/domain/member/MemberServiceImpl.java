package io.ssafy.p.k13c103.coreapi.domain.member;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public MemberResponseDto.RegisteredMemberInfo register(MemberRequestDto.RegisterMember registerMember) {
        if (memberRepository.existsByEmail(registerMember.email()))
            throw new ApiException(ErrorCode.MEMBER_EMAIL_DUPLICATED);

        Member member = Member.builder()
                .email(registerMember.email())
                .password(passwordEncoder.encode(registerMember.password()))
                .name(registerMember.name())
                .build();

        memberRepository.save(member);

        return MemberResponseDto.RegisteredMemberInfo.builder()
                .memberUid(member.getMemberUid()).build();
    }
}
