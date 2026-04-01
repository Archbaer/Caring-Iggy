package com.caringiggy.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping("/animals")
    public ResponseEntity<Map<String, Object>> animalsFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "error", "Animal service is temporarily unavailable",
                        "status", 503,
                        "timestamp", LocalDateTime.now().toString()
                ));
    }

    @GetMapping("/adopters")
    public ResponseEntity<Map<String, Object>> adoptersFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "error", "Adopter service is temporarily unavailable",
                        "status", 503,
                        "timestamp", LocalDateTime.now().toString()
                ));
    }

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> usersFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "error", "User service is temporarily unavailable",
                        "status", 503,
                        "timestamp", LocalDateTime.now().toString()
                ));
    }

    @GetMapping("/matching")
    public ResponseEntity<Map<String, Object>> matchingFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "error", "Matching service is temporarily unavailable",
                        "status", 503,
                        "timestamp", LocalDateTime.now().toString()
                ));
    }

    @GetMapping("/reports")
    public ResponseEntity<Map<String, Object>> reportsFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "error", "Reporting service is temporarily unavailable",
                        "status", 503,
                        "timestamp", LocalDateTime.now().toString()
                ));
    }
}
