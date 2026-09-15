package com.caringiggy.user.config;

import com.caringiggy.user.controller.AuthController;
import com.caringiggy.user.dto.AuthResponse;
import com.caringiggy.user.dto.ProvisionAccountRequest;
import com.caringiggy.user.dto.SessionUserDto;
import com.caringiggy.user.service.AuthService;
import com.caringiggy.user.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class UserSecurityTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean AuthService authService;
    @MockBean JwtService jwtService;
    @MockBean JwtDecoder jwtDecoder;

    private String provisionPayload() throws Exception {
        return objectMapper.writeValueAsString(ProvisionAccountRequest.builder()
                .name("Staff User")
                .email("staff@example.com")
                .telephone("555-0100")
                .password("supersecret")
                .role("STAFF")
                .build());
    }

    @Test
    void provision_withoutToken_returnsUnauthorized() throws Exception {
        mvc.perform(post("/api/auth/provision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(provisionPayload()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void provision_withStaffRole_returnsForbidden() throws Exception {
        mvc.perform(post("/api/auth/provision")
                        .with(jwt().jwt(j -> j.claim("role", "STAFF")).authorities(new SimpleGrantedAuthority("ROLE_STAFF")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(provisionPayload()))
                .andExpect(status().isForbidden());
    }

    @Test
    void provision_withAdminRole_returnsCreated() throws Exception {
        AuthResponse response = AuthResponse.builder()
                .user(SessionUserDto.builder()
                        .accountId(UUID.randomUUID())
                        .role("STAFF")
                        .profileType("EMPLOYEE")
                        .profileId(UUID.randomUUID())
                        .build())
                .expiresAtEpochSeconds(1_900_000_000L)
                .build();
        when(authService.provisionEmployeeAccount(any(ProvisionAccountRequest.class), eq("admin-session")))
                .thenReturn(response);

        mvc.perform(post("/api/auth/provision")
                        .with(jwt().jwt(j -> j.claim("role", "ADMIN")).authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .cookie(new Cookie("session", "admin-session"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(provisionPayload()))
                .andExpect(status().isCreated());
    }

    @Test
    void session_anonymous_returnsOkWhenValidationSucceeds() throws Exception {
        AuthResponse response = AuthResponse.builder()
                .user(SessionUserDto.builder()
                        .accountId(UUID.randomUUID())
                        .role("ADOPTER")
                        .profileType("ADOPTER")
                        .profileId(UUID.randomUUID())
                        .build())
                .expiresAtEpochSeconds(1_900_000_000L)
                .build();
        when(authService.validateSession(null)).thenReturn(Optional.of(response));

        mvc.perform(get("/api/auth/session"))
                .andExpect(status().isOk());
    }
}
