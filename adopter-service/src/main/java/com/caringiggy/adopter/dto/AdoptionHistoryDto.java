package com.caringiggy.adopter.dto;

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
public class AdoptionHistoryDto {
    private UUID id;
    private UUID adopterId;
    private String adopterName;
    private UUID animalId;
    private String animalName;
    private LocalDate adoptionDate;
    private String notes;
}
