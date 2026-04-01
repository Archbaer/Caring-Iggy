package com.caringiggy.adopter.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdoptionHistory {
    private UUID id;
    private UUID adopterId;
    private UUID animalId;
    private LocalDate adoptionDate;
    private String notes;
    private LocalDateTime createdAt;
}
