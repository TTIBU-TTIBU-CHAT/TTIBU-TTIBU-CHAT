package io.ssafy.p.k13c103.coreapi.domain.member;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.config.security.CustomMemberDetails;
import io.ssafy.p.k13c103.coreapi.domain.member.entity.Member;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository; // NPE 방지를 위해 빈 주입

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

    @Override
    @Transactional
    public MemberResponseDto.MemberInfo login(MemberRequestDto.LoginMember loginMember, HttpServletRequest request, HttpServletResponse response) {
        // 로그인 검증
        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(loginMember.email(), loginMember.password());
        Authentication auth = authenticationManager.authenticate(authToken);

        // 인증 성공 -> 세션에 정보 저장
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);

        securityContextRepository.saveContext(context, request, response);

        CustomMemberDetails member = (CustomMemberDetails) auth.getPrincipal();
        return MemberResponseDto.MemberInfo.builder()
                .email(member.getUsername())
                .name(member.getName())
                .build();
    }

    @Override
    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null) {
            // context 및 세션 무효화
            new SecurityContextLogoutHandler().logout(request, response, auth);
            log.info("logout successful: {}", auth.getName());
        } else {
            log.warn("Security context is null");
        }

        Cookie cookie = new Cookie("JSESSIONID", "");
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
