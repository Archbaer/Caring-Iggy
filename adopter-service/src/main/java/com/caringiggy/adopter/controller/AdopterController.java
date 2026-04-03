package com.caringiggy.adopter.controller;

import com.caringiggy.adopter.dto.*;
import com.caringiggy.adopter.service.AdopterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/adopters")
@RequiredArgsConstructor
public class AdopterController {

    private final AdopterService adopterService;

    @GetMapping
    public ResponseEntity<List<AdopterDto>> getAllAdopters(@RequestParam(required = false) String status) {
        if (status != null) {
            return ResponseEntity.ok(adopterService.getAdoptersByStatus(status));
        }
        return ResponseEntity.ok(adopterService.getAllAdopters());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdopterDto> getAdopterById(@PathVariable UUID id) {
        return ResponseEntity.ok(adopterService.getAdopterById(id));
    }

    @GetMapping("/restricted")
    public ResponseEntity<List<AdopterRestrictedDto>> getAllAdoptersRestricted() {
        return ResponseEntity.ok(adopterService.getAllAdoptersRestricted());
    }

    @GetMapping("/restricted/{id}")
    public ResponseEntity<AdopterRestrictedDto> getAdopterRestricted(@PathVariable UUID id) {
        return ResponseEntity.ok(adopterService.getAdopterRestricted(id));
    }

    @PostMapping
    public ResponseEntity<AdopterDto> createAdopter(@Valid @RequestBody CreateAdopterRequest request) {
        AdopterDto createdAdopter = adopterService.createAdopter(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdAdopter);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdopterDto> updateAdopter(
            @PathVariable UUID id,
            @RequestBody UpdateAdopterRequest request) {
        return ResponseEntity.ok(adopterService.updateAdopter(id, request));
    }

    @PutMapping("/{id}/interests")
    public ResponseEntity<AdopterDto> updateInterests(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateInterestsRequest request) {
        return ResponseEntity.ok(adopterService.updateInterests(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAdopter(@PathVariable UUID id) {
        adopterService.deleteAdopter(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<AdoptionHistoryDto>> getAdoptionHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(adopterService.getAdoptionHistoryByAdopter(id));
    }

    @PostMapping("/history")
    public ResponseEntity<AdoptionHistoryDto> createAdoptionHistory(
            @Valid @RequestBody CreateAdoptionHistoryRequest request) {
        AdoptionHistoryDto createdHistory = adopterService.createAdoptionHistory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdHistory);
    }
}
