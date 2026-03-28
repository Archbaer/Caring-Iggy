package com.caringiggy.animal.dto;

import jakarta.validation.constraints.NotBlank;
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
public class CreateAnimalRequest {
    @NotBlank(message = "Name is required")
    private String name;
    
    private LocalDate dateOfBirth;
    private String animalType;
    private String breed;
    private String gender;
    private String size;
    private String temperament;
    private String status;
    private LocalDate intakeDate;
    private String description;
    private String imageUrl;
    private PreviousOwnerRequest previousOwner;
}
