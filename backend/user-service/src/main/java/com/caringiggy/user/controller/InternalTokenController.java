package com.caringiggy.user.controller;

import com.caringiggy.user.dto.AuthResponse;
import com.caringiggy.user.service.AuthService;
import com.caringiggy.user.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/internal/token")
public class InternalTokenController {

    private final AuthService authService;
    private final JwtService jwtService;

    public InternalTokenController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    public record ExchangeRequest(String sessionToken) {}

    @PostMapping
    public ResponseEntity<?> exchange(@RequestBody ExchangeRequest body) {
        Optional<AuthResponse> session = authService.validateSession(body.sessionToken());
        if (session.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        String token = jwtService.mint(session.get());
        long exp = Instant.now().getEpochSecond() + jwtService.ttlSeconds();
        return ResponseEntity.ok(Map.of("token", token, "expiresAtEpochSeconds", exp));
    }
}
