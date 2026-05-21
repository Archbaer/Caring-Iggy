package com.caringiggy.matching.controller;

import com.caringiggy.matching.dto.MatchingResponse;
import com.caringiggy.matching.service.MatchingService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
@Validated
public class MatchingController {

    private final MatchingService matchingService;

    @PostMapping("/adopter")
    public ResponseEntity<MatchingResponse> findMatches(
            @NotBlank(message = "name is required") @Size(max = 255) @RequestParam String name,
            @NotBlank(message = "telephone is required") @Size(max = 50) @RequestParam String telephone) {
        return ResponseEntity.ok(matchingService.findMatches(name, telephone));
    }
}
