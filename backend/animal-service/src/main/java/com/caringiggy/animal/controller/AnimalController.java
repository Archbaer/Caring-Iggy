package com.caringiggy.animal.controller;

import com.caringiggy.animal.dto.AnimalDetailDto;
import com.caringiggy.animal.dto.AnimalSummaryDto;
import com.caringiggy.animal.dto.CreateAnimalRequest;
import com.caringiggy.animal.dto.UpdateAnimalRequest;
import com.caringiggy.animal.service.AnimalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/animals")
@RequiredArgsConstructor
public class AnimalController {

    private final AnimalService animalService;

    @GetMapping
    public ResponseEntity<List<AnimalSummaryDto>> getAllAnimals(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type) {
        
        if (status != null && type != null) {
            return ResponseEntity.ok(animalService.getAnimalsByStatusAndType(status, type));
        } else if (status != null) {
            return ResponseEntity.ok(animalService.getAnimalsByStatus(status));
        } else if (type != null) {
            return ResponseEntity.ok(animalService.getAnimalsByType(type));
        }
        return ResponseEntity.ok(animalService.getAllAnimals());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AnimalDetailDto> getAnimalById(@PathVariable UUID id) {
        return ResponseEntity.ok(animalService.getAnimalById(id));
    }

    @PostMapping
    public ResponseEntity<AnimalDetailDto> createAnimal(@Valid @RequestBody CreateAnimalRequest request) {
        AnimalDetailDto createdAnimal = animalService.createAnimal(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdAnimal);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AnimalDetailDto> updateAnimal(
            @PathVariable UUID id,
            @RequestBody UpdateAnimalRequest request) {
        return ResponseEntity.ok(animalService.updateAnimal(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAnimal(@PathVariable UUID id) {
        animalService.deleteAnimal(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/previous-owner/{ownerId}")
    public ResponseEntity<List<AnimalSummaryDto>> getAnimalsByPreviousOwner(@PathVariable UUID ownerId) {
        return ResponseEntity.ok(animalService.getAnimalsByPreviousOwner(ownerId));
    }
}
