package com.caringiggy.matching.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;

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

    private String token(String issuer, String audience) {
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(rsaKey.getKeyID()).build();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .audience(java.util.List.of(audience))
                .subject("user-1")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    @Test
    void wrongIssuerRejected() {
        String bad = token("evil", "caring-iggy-internal");
        assertThatThrownBy(() -> decoder.decode(bad)).isInstanceOf(JwtValidationException.class);
    }

    @Test
    void wrongAudienceRejected() {
        String bad = token("caring-iggy-user-service", "other");
        assertThatThrownBy(() -> decoder.decode(bad)).isInstanceOf(JwtValidationException.class);
    }

    @Test
    void correctIssuerAndAudienceAccepted() {
        String ok = token("caring-iggy-user-service", "caring-iggy-internal");
        Jwt jwt = decoder.decode(ok);
        assertThat(jwt.getSubject()).isEqualTo("user-1");
    }
}
