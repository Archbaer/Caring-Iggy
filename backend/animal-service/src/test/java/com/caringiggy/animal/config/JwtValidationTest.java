package com.caringiggy.animal.config;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.JWKSet;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtValidationTest {

    private static final RSAKey RSA_KEY = generateKey();

    private static RSAKey generateKey() {
        try {
            return new RSAKeyGenerator(2048).keyID("ci-key-1").generate();
        } catch (JOSEException e) {
            throw new RuntimeException(e);
        }
    }

    private JwtDecoder buildDecoder() throws JOSEException {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(RSA_KEY.toRSAPublicKey()).build();
        decoder.setJwtValidator(JwtValidation.validator());
        return decoder;
    }

    private String signToken(String iss, String aud) throws JOSEException {
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(RSA_KEY)));
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(iss)
                .audience(java.util.List.of(aud))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .subject("test-user")
                .build();
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    @Test
    void rejectsWrongIssuer() throws Exception {
        JwtDecoder decoder = buildDecoder();
        String token = signToken("evil", "caring-iggy-internal");
        assertThrows(JwtValidationException.class, () -> decoder.decode(token));
    }

    @Test
    void rejectsWrongAudience() throws Exception {
        JwtDecoder decoder = buildDecoder();
        String token = signToken("caring-iggy-user-service", "other");
        assertThrows(JwtValidationException.class, () -> decoder.decode(token));
    }

    @Test
    void acceptsCorrectIssuerAndAudience() throws Exception {
        JwtDecoder decoder = buildDecoder();
        String token = signToken("caring-iggy-user-service", "caring-iggy-internal");
        Jwt jwt = decoder.decode(token);
        assertThat(jwt.getSubject()).isEqualTo("test-user");
    }
}
