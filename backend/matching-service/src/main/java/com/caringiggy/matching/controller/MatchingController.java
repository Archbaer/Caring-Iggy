package com.caringiggy.matching.controller;

import com.caringiggy.matching.dto.MatchingResponse;
import com.caringiggy.matching.service.MatchingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
public class MatchingController {

    private final MatchingService matchingService;

    @PostMapping("/adopter")
    public ResponseEntity<MatchingResponse> findMatches(@RequestParam String name, @RequestParam String telephone) {
        return ResponseEntity.ok(matchingService.findMatches(name, telephone));
    }
}
