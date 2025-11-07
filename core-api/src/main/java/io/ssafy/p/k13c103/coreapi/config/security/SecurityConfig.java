package io.ssafy.p.k13c103.coreapi.config.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    @Value("${app.security.csrf-mode:token}")
    String csrfMode;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 인가 규칙
                .authorizeHttpRequests(auth -> auth
                        // swagger 허용
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**").permitAll()
                        // 정적 리소스 허용
                        .requestMatchers("/", "/css/**", "/js/**", "/images/**").permitAll()
                        // CSRF 토큰 발급 허용
                        .requestMatchers(HttpMethod.GET, "/api/v1/members/csrf").permitAll()
                        // 로그인 전 허용
                        .requestMatchers(HttpMethod.POST, "/api/v1/members").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/members/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/members/logout").permitAll()
                        // CORS 프리플라이트
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // 그 외 모두 인증 필요
                        .anyRequest().authenticated()
                )
                // 로그인/로그아웃 비활성화 -> API로 처리
                .formLogin(login -> login.disable())
                .logout(logout -> logout.disable())
                // 세션
                .sessionManagement(s -> s
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation(sf -> sf.migrateSession())
                )
                // 보안 헤더
                .headers(h -> h.frameOptions(f -> f.sameOrigin()))
                // CORS
                .cors(Customizer.withDefaults())
                .securityContext(sc -> sc.securityContextRepository(securityContextRepository()));

        // CSRF
        if ("ignore".equalsIgnoreCase(csrfMode)) {
            // 개발 모드
            http.csrf(csrf -> csrf
                    .ignoringRequestMatchers("/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**")
                    .ignoringRequestMatchers("/api/v1/members", "/api/v1/members/login", "/api/v1/members/logout")
                    .csrfTokenRepository(new HttpSessionCsrfTokenRepository())
            );
        } else {
            // 운영 모드
            http.csrf(csrf -> csrf
                    .csrfTokenRepository(new HttpSessionCsrfTokenRepository())
            );
        }

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration auth) throws Exception {
        return auth.getAuthenticationManager();
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    /**
     * CORS 설정
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(List.of("http://localhost:5173"));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        c.setAllowedHeaders(List.of("Content-Type", "Authorization", "X-XSRF-TOKEN"));
        c.setExposedHeaders(List.of("Set-Cookie"));
        c.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
        s.registerCorsConfiguration("/**", c);
        return s;
    }

    @Bean
    public CookieSerializer sessionCookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        boolean isProd = !"ignore".equalsIgnoreCase(csrfMode);

        serializer.setSameSite("None"); // "None"으로 설정
        serializer.setUseSecureCookie(isProd);
        serializer.setCookiePath("/");

        return serializer;
    }

    @Bean
    public SessionAuthenticationStrategy sessionAuthenticationStrategy() {
        return new CompositeSessionAuthenticationStrategy(
                List.of(
                        new ChangeSessionIdAuthenticationStrategy(),
                        new CsrfAuthenticationStrategy(new HttpSessionCsrfTokenRepository())
                )
        );
    }
}