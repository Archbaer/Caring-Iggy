package com.caringiggy.user.controller;

import com.caringiggy.user.config.SecurityConfig;
import com.caringiggy.user.dto.AuthResponse;
import com.caringiggy.user.service.AuthService;
import com.caringiggy.user.service.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = InternalTokenController.class)
@Import(SecurityConfig.class)
class InternalTokenControllerTest {

    @Autowired MockMvc mvc;
    @MockBean AuthService authService;
    @MockBean JwtService jwtService;
    @MockBean JwtDecoder jwtDecoder;

    @Test
    void exchangesValidSessionForToken() throws Exception {
        when(authService.validateSession("good-session"))
                .thenReturn(Optional.of(AuthResponse.builder().accountId("a").role("STAFF").build()));
        when(jwtService.mint(org.mockito.ArgumentMatchers.any())).thenReturn("signed.jwt.value");
        when(jwtService.ttlSeconds()).thenReturn(300L);

        mvc.perform(post("/internal/token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sessionToken\":\"good-session\"}"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.token").value("signed.jwt.value"));
    }

    @Test
    void rejectsInvalidSession() throws Exception {
        when(authService.validateSession("bad")).thenReturn(Optional.empty());

        mvc.perform(post("/internal/token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sessionToken\":\"bad\"}"))
           .andExpect(status().isUnauthorized());
    }
}
