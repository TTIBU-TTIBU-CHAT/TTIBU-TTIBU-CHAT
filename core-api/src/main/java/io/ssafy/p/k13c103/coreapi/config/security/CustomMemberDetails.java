package io.ssafy.p.k13c103.coreapi.config.security;

import io.ssafy.p.k13c103.coreapi.domain.member.Member;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class CustomMemberDetails implements UserDetails {
    private final Long memberUid;
    private final String email;
    private final String password;
    private final String name;

    public CustomMemberDetails(Member member) {
        this.memberUid = member.getMemberUid();
        this.email = member.getEmail();
        this.password = member.getPassword();
        this.name = member.getName();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return UserDetails.super.isAccountNonExpired();
    }

    @Override
    public boolean isAccountNonLocked() {
        return UserDetails.super.isAccountNonLocked();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return UserDetails.super.isCredentialsNonExpired();
    }

    @Override
    public boolean isEnabled() {
        return UserDetails.super.isEnabled();
    }
}
