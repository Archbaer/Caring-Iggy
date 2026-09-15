package com.caringiggy.reporting.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;

class FeignTokenRelayConfigTest {

    private final RequestInterceptor interceptor = new FeignTokenRelayConfig().tokenRelayInterceptor();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void addsAuthorizationHeaderWhenJwtAuthenticated() {
        Jwt jwt = Jwt.withTokenValue("abc")
                .header("alg", "RS256")
                .claim("sub", "x")
                .build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));

        RequestTemplate template = new RequestTemplate();
        interceptor.apply(template);

        assertThat(template.headers().get("Authorization")).containsExactly("Bearer abc");
    }

    @Test
    void addsNoHeaderWhenNoAuthentication() {
        RequestTemplate template = new RequestTemplate();
        interceptor.apply(template);

        assertThat(template.headers().get("Authorization")).isNull();
    }
}
