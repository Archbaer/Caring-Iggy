package com.caringiggy.matching.config;

import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;

import java.util.Collection;

public final class JwtValidation {

    private JwtValidation() {
    }

    public static OAuth2TokenValidator<Jwt> validator() {
        return new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                new JwtIssuerValidator("caring-iggy-user-service"),
                new JwtClaimValidator<Collection<String>>("aud", aud -> aud != null && aud.contains("caring-iggy-internal"))
        );
    }
}
