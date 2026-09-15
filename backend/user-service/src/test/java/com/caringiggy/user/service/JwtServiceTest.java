package com.caringiggy.user.service;

import com.caringiggy.user.dto.AuthResponse;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;
    private JwtDecoder decoder;

    @BeforeEach
    void setUp() throws Exception {
        RSAKey rsaKey = new RSAKeyGenerator(2048).keyID("ci-key-1").generate();
        jwtService = new JwtService(rsaKey);
        decoder = NimbusJwtDecoder.withPublicKey(rsaKey.toRSAPublicKey()).build();
    }

    @Test
    void mintsTokenWithExpectedClaims() {
        AuthResponse auth = AuthResponse.builder()
                .accountId("acct-123")
                .role("STAFF")
                .profileId("prof-456")
                .build();

        String token = jwtService.mint(auth);
        Jwt decoded = decoder.decode(token);

        assertThat(decoded.getSubject()).isEqualTo("acct-123");
        assertThat(decoded.getClaimAsString("role")).isEqualTo("STAFF");
        assertThat(decoded.getClaimAsString("profileId")).isEqualTo("prof-456");
        assertThat(decoded.getClaimAsString("iss")).isEqualTo("caring-iggy-user-service");
        assertThat(decoded.getAudience()).contains("caring-iggy-internal");
    }

    @Test
    void mintsTokenExpiringInFiveMinutes() {
        String token = jwtService.mint(AuthResponse.builder().accountId("a").role("ADOPTER").build());
        Jwt decoded = decoder.decode(token);
        long ttl = decoded.getExpiresAt().getEpochSecond() - decoded.getIssuedAt().getEpochSecond();
        assertThat(ttl).isEqualTo(300);
    }
}
