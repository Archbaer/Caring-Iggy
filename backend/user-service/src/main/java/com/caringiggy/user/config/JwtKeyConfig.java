package com.caringiggy.user.config;

import com.nimbusds.jose.jwk.RSAKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Configuration
public class JwtKeyConfig {

    @Bean
    public RSAKey rsaKey(
            @Value("${JWT_PRIVATE_KEY}") String privateKeyBase64,
            @Value("${JWT_PUBLIC_KEY}") String publicKeyBase64,
            @Value("${JWT_KEY_ID:ci-key-1}") String keyId) throws Exception {

        RSAPrivateKey priv = parsePrivate(decodePem(privateKeyBase64, "PRIVATE"));
        RSAPublicKey pub = parsePublic(decodePem(publicKeyBase64, "PUBLIC"));
        return new RSAKey.Builder(pub).privateKey(priv).keyID(keyId).build();
    }

    private static byte[] decodePem(String base64Pem, String marker) {
        String pem = new String(Base64.getDecoder().decode(base64Pem));
        String body = pem
                .replace("-----BEGIN " + marker + " KEY-----", "")
                .replace("-----END " + marker + " KEY-----", "")
                .replaceAll("\\s", "");
        return Base64.getDecoder().decode(body);
    }

    private static RSAPrivateKey parsePrivate(byte[] der) throws Exception {
        return (RSAPrivateKey) KeyFactory.getInstance("RSA")
                .generatePrivate(new PKCS8EncodedKeySpec(der));
    }

    private static RSAPublicKey parsePublic(byte[] der) throws Exception {
        return (RSAPublicKey) KeyFactory.getInstance("RSA")
                .generatePublic(new X509EncodedKeySpec(der));
    }
}
