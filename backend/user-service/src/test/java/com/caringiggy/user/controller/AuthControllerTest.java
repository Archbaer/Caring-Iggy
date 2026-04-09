package com.caringiggy.user.controller;

import com.caringiggy.user.dto.AuthResponse;
import com.caringiggy.user.dto.LoginRequest;
import com.caringiggy.user.dto.ProvisionAccountRequest;
import com.caringiggy.user.dto.SessionUserDto;
import com.caringiggy.user.dto.SignupRequest;
import com.caringiggy.user.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    void login_setsSessionCookieAndReturnsCanonicalRole() throws Exception {
        AuthResponse response = AuthResponse.builder()
                .user(SessionUserDto.builder()
                        .accountId(UUID.randomUUID())
                        .role("ADMIN")
                        .profileType("EMPLOYEE")
                        .profileId(UUID.randomUUID())
                        .build())
                .expiresAtEpochSeconds(1_900_000_000L)
                .build();

        when(authService.login(any(LoginRequest.class)))
                .thenReturn(new AuthService.AuthenticatedSession("opaque-token", response));
        when(authService.buildSessionCookie(eq("opaque-token"), any(LocalDateTime.class)))
                .thenReturn(ResponseCookie.from("session", "opaque-token").httpOnly(true).path("/").build());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder()
                                .email("admin@example.com")
                                .password("supersecret")
                                .build())))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", containsString("session=opaque-token")))
                .andExpect(jsonPath("$.user.role").value("ADMIN"));
    }

    @Test
    void session_returnsUnauthorizedWhenMissing() throws Exception {
        when(authService.validateSession(null)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/auth/session"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void signup_returnsCreated() throws Exception {
        AuthResponse response = AuthResponse.builder()
                .user(SessionUserDto.builder()
                        .accountId(UUID.randomUUID())
                        .role("ADOPTER")
                        .profileType("ADOPTER")
                        .profileId(UUID.randomUUID())
                        .build())
                .expiresAtEpochSeconds(1_900_000_000L)
                .build();

        when(authService.signupAdopter(any(SignupRequest.class)))
                .thenReturn(new AuthService.AuthenticatedSession("signup-token", response));
        when(authService.buildSessionCookie(eq("signup-token"), any(LocalDateTime.class)))
                .thenReturn(ResponseCookie.from("session", "signup-token").httpOnly(true).path("/").build());

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(SignupRequest.builder()
                                .firstName("Ava")
                                .lastName("Adopter")
                                .email("ava@example.com")
                                .telephone("123456")
                                .password("supersecret")
                                .build())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.role").value("ADOPTER"));
    }

    @Test
    void provision_endpointExistsAndReturnsCreated() throws Exception {
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

        mockMvc.perform(post("/api/auth/provision")
                        .cookie(new jakarta.servlet.http.Cookie("session", "admin-session"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ProvisionAccountRequest.builder()
                                .name("Staff User")
                                .email("staff@example.com")
                                .telephone("555-0100")
                                .password("supersecret")
                                .role("STAFF")
                                .build())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.role").value("STAFF"));
    }

    @Test
    void provision_staffEndpointReturnsCreated() throws Exception {
        AuthResponse response = AuthResponse.builder()
                .user(SessionUserDto.builder()
                        .accountId(UUID.randomUUID())
                        .role("STAFF")
                        .profileType("EMPLOYEE")
                        .profileId(UUID.randomUUID())
                        .build())
                .expiresAtEpochSeconds(1_900_000_000L)
                .build();
        when(authService.provisionStaffAccount(any(ProvisionAccountRequest.class), eq("admin-session")))
                .thenReturn(response);

        mockMvc.perform(post("/api/auth/provision/staff")
                        .cookie(new jakarta.servlet.http.Cookie("session", "admin-session"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ProvisionAccountRequest.builder()
                                .name("Staff User")
                                .email("staff@example.com")
                                .telephone("555-0100")
                                .password("supersecret")
                                .role("ADMIN")
                                .build())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.role").value("STAFF"))
                .andExpect(jsonPath("$.user.profileType").value("EMPLOYEE"));
    }

    @Test
    void provision_adminEndpointReturnsCreated() throws Exception {
        AuthResponse response = AuthResponse.builder()
                .user(SessionUserDto.builder()
                        .accountId(UUID.randomUUID())
                        .role("ADMIN")
                        .profileType("EMPLOYEE")
                        .profileId(UUID.randomUUID())
                        .build())
                .expiresAtEpochSeconds(1_900_000_000L)
                .build();
        when(authService.provisionAdminAccount(any(ProvisionAccountRequest.class), eq("admin-session")))
                .thenReturn(response);

        mockMvc.perform(post("/api/auth/provision/admin")
                        .cookie(new jakarta.servlet.http.Cookie("session", "admin-session"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ProvisionAccountRequest.builder()
                                .name("Admin User")
                                .email("admin@example.com")
                                .telephone("555-0101")
                                .password("supersecret")
                                .role("STAFF")
                                .build())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.user.profileType").value("EMPLOYEE"));
    }
}
