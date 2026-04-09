package com.caringiggy.user.controller;

import com.caringiggy.user.dto.AuthResponse;
import com.caringiggy.user.dto.LoginRequest;
import com.caringiggy.user.dto.ProvisionAccountRequest;
import com.caringiggy.user.dto.SignupRequest;
import com.caringiggy.user.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        AuthService.AuthenticatedSession authenticatedSession = authService.signupAdopter(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, authService.buildSessionCookie(
                        authenticatedSession.sessionToken(),
                        java.time.Instant.ofEpochSecond(authenticatedSession.response().getExpiresAtEpochSeconds())
                                .atOffset(java.time.ZoneOffset.UTC)
                                .toLocalDateTime()).toString())
                .body(authenticatedSession.response());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthService.AuthenticatedSession authenticatedSession = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authService.buildSessionCookie(
                        authenticatedSession.sessionToken(),
                        java.time.Instant.ofEpochSecond(authenticatedSession.response().getExpiresAtEpochSeconds())
                                .atOffset(java.time.ZoneOffset.UTC)
                                .toLocalDateTime()).toString())
                .body(authenticatedSession.response());
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(
            @CookieValue(name = AuthService.SESSION_COOKIE_NAME, required = false) String sessionToken) {
        authService.logout(sessionToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authService.clearSessionCookie().toString())
                .body(Map.of("loggedOut", true));
    }

    @GetMapping("/session")
    public ResponseEntity<AuthResponse> session(
            @CookieValue(name = AuthService.SESSION_COOKIE_NAME, required = false) String sessionToken) {
        return authService.validateSession(sessionToken)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/provision")
    public ResponseEntity<AuthResponse> provision(
            @Valid @RequestBody ProvisionAccountRequest request,
            @CookieValue(name = AuthService.SESSION_COOKIE_NAME, required = false) String sessionToken) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.provisionEmployeeAccount(request, sessionToken));
    }

    @PostMapping("/provision/staff")
    public ResponseEntity<AuthResponse> provisionStaff(
            @Valid @RequestBody ProvisionAccountRequest request,
            @CookieValue(name = AuthService.SESSION_COOKIE_NAME, required = false) String sessionToken) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.provisionStaffAccount(request, sessionToken));
    }

    @PostMapping("/provision/admin")
    public ResponseEntity<AuthResponse> provisionAdmin(
            @Valid @RequestBody ProvisionAccountRequest request,
            @CookieValue(name = AuthService.SESSION_COOKIE_NAME, required = false) String sessionToken) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.provisionAdminAccount(request, sessionToken));
    }
}
