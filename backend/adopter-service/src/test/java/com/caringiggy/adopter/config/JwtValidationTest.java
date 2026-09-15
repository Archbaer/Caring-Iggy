package com.caringiggy.adopter.config;

import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.JWKSet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtValidationTest {

    private RSAKey rsaKey;
    private NimbusJwtEncoder encoder;
    private JwtDecoder decoder;

    @BeforeEach
    void setUp() throws Exception {
        rsaKey = new RSAKeyGenerator(2048).keyID("ci-key-1").generate();
        encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(rsaKey)));
        NimbusJwtDecoder nimbusDecoder = NimbusJwtDecoder.withPublicKey(rsaKey.toRSAPublicKey()).build();
        nimbusDecoder.setJwtValidator(JwtValidation.validator());
        decoder = nimbusDecoder;
    }

    private String sign(String iss, String aud) {
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).keyId("ci-key-1").build();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(iss)
                .audience(java.util.List.of(aud))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .subject("test-subject")
                .build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    @Test
    void wrongIssuerRejected() {
        String token = sign("evil", "caring-iggy-internal");
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtValidationException.class);
    }

    @Test
    void wrongAudienceRejected() {
        String token = sign("caring-iggy-user-service", "other");
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtValidationException.class);
    }

    @Test
    void correctIssuerAndAudienceAccepted() {
        String token = sign("caring-iggy-user-service", "caring-iggy-internal");
        Jwt jwt = decoder.decode(token);
        assertThat(jwt.getClaimAsString("iss")).isEqualTo("caring-iggy-user-service");
    }
}
