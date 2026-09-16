package com.caringiggy.user.config;

import com.nimbusds.jose.jwk.RSAKey;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class JwtKeyConfigTest {

    @Test
    void buildsRsaKeyFromBase64Pems() throws Exception {
        String priv = Base64.getEncoder().encodeToString(
                Files.readAllBytes(Path.of("src/test/resources/test-jwt-private.pem")));
        String pub = Base64.getEncoder().encodeToString(
                Files.readAllBytes(Path.of("src/test/resources/test-jwt-public.pem")));

        RSAKey key = new JwtKeyConfig().rsaKey(priv, pub, "ci-key-1");

        assertThat(key.getKeyID()).isEqualTo("ci-key-1");
        assertThat(key.toRSAPrivateKey()).isNotNull();
        assertThat(key.toRSAPublicKey()).isNotNull();
    }
}
