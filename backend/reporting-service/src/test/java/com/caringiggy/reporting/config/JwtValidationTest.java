package com.caringiggy.reporting.config;

import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtValidationTest {

    @Test
    void rejectsWrongIssuerAcceptsCorrect() throws Exception {
        RSAKey key = new RSAKeyGenerator(2048).keyID("ci-key-1").generate();
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(key)));

        JwtDecoder decoder = NimbusJwtDecoder.withPublicKey(key.toRSAPublicKey()).build();
        ((NimbusJwtDecoder) decoder).setJwtValidator(JwtValidation.validator());

        Jwt wrongIssuer = encode(encoder, "evil", "caring-iggy-internal");
        Jwt wrongAudience = encode(encoder, "caring-iggy-user-service", "other");
        Jwt ok = encode(encoder, "caring-iggy-user-service", "caring-iggy-internal");

        assertThatThrownBy(() -> decoder.decode(wrongIssuer.getTokenValue())).isInstanceOf(JwtValidationException.class);
        assertThatThrownBy(() -> decoder.decode(wrongAudience.getTokenValue())).isInstanceOf(JwtValidationException.class);
        assertThat(decoder.decode(ok.getTokenValue()).getSubject()).isEqualTo("x");
    }

    private Jwt encode(NimbusJwtEncoder encoder, String issuer, String audience) {
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).build();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .audience(java.util.List.of(audience))
                .subject("x")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        return encoder.encode(JwtEncoderParameters.from(header, claims));
    }
}
