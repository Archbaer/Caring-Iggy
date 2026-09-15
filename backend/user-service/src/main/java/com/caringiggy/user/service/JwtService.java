package com.caringiggy.user.service;

import com.caringiggy.user.dto.AuthResponse;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class JwtService {

    private static final String ISSUER = "caring-iggy-user-service";
    private static final String AUDIENCE = "caring-iggy-internal";
    private static final long TTL_SECONDS = 300;

    private final JwtEncoder encoder;

    public JwtService(RSAKey rsaKey) {
        this.encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(rsaKey)));
    }

    public String mint(AuthResponse auth) {
        Instant now = Instant.now();
        JwtClaimsSet.Builder builder = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .audience(java.util.List.of(AUDIENCE))
                .subject(auth.getAccountId())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(TTL_SECONDS))
                .claim("role", auth.getRole());

        if (auth.getProfileId() != null) {
            builder.claim("profileId", auth.getProfileId());
        }

        JwtClaimsSet claims = builder.build();
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    public long ttlSeconds() {
        return TTL_SECONDS;
    }

    public String mintServiceToken() {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .audience(java.util.List.of(AUDIENCE))
                .subject("user-service")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(TTL_SECONDS))
                .claim("role", "STAFF")
                .build();
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
}
