package com.caringiggy.adopter.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAdoptionHistoryRequest {
    @NotNull(message = "Adopter ID is required")
    private UUID adopterId;
    
    @NotNull(message = "Animal ID is required")
    private UUID animalId;
    
    private LocalDate adoptionDate;
    private String notes;
}
