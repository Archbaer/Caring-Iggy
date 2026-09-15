package com.caringiggy.user.controller;

import com.caringiggy.user.config.JwtKeyConfig;
import com.caringiggy.user.config.SecurityConfig;
import com.nimbusds.jose.jwk.RSAKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = JwksController.class)
@Import(SecurityConfig.class)
class JwksControllerTest {

    @Autowired MockMvc mvc;

    @TestConfiguration
    static class Keys {
        @Bean RSAKey rsaKey() throws Exception {
            return new com.nimbusds.jose.jwk.gen.RSAKeyGenerator(2048).keyID("ci-key-1").generate();
        }
    }

    @Test
    void publishesPublicKeyOnly() throws Exception {
        mvc.perform(get("/.well-known/jwks.json"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.keys[0].kid").value("ci-key-1"))
           .andExpect(jsonPath("$.keys[0].kty").value("RSA"))
           .andExpect(jsonPath("$.keys[0].d").doesNotExist()); // no private exponent
    }
}
