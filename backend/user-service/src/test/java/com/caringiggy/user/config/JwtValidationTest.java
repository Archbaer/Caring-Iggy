package com.caringiggy.user.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.*;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtValidationTest {

    private JwtEncoder encoder;
    private JwtDecoder decoder;

    @BeforeEach
    void setUp() throws Exception {
        RSAKey rsaKey = new RSAKeyGenerator(2048).keyID("ci-key-1").generate();
        encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(rsaKey)));
        NimbusJwtDecoder nimbusDecoder = NimbusJwtDecoder.withPublicKey(rsaKey.toRSAPublicKey()).build();
        nimbusDecoder.setJwtValidator(JwtValidation.validator());
        decoder = nimbusDecoder;
    }

    private String sign(String issuer, String audience) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .audience(List.of(audience))
                .subject("acct-1")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(300))
                .claim("role", "STAFF")
                .build();
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    @Test
    void rejectsWrongIssuer() {
        String token = sign("evil", "caring-iggy-internal");
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtValidationException.class);
    }

    @Test
    void rejectsWrongAudience() {
        String token = sign("caring-iggy-user-service", "other");
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtValidationException.class);
    }

    @Test
    void acceptsCorrectIssuerAndAudience() {
        String token = sign("caring-iggy-user-service", "caring-iggy-internal");
        assertThat(decoder.decode(token).getSubject()).isEqualTo("acct-1");
    }
}
