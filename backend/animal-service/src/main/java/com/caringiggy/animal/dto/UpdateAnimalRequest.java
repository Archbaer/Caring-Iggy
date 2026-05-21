package com.caringiggy.animal.dto;

import jakarta.validation.constraints.Pattern;
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
public class UpdateAnimalRequest {
    private String name;
    private LocalDate dateOfBirth;
    private String animalType;
    private String breed;

    @Pattern(regexp = "MALE|FEMALE|UNKNOWN", message = "gender must be MALE, FEMALE, or UNKNOWN")
    private String gender;

    @Pattern(regexp = "SMALL|MEDIUM|LARGE", message = "size must be SMALL, MEDIUM, or LARGE")
    private String size;

    private String temperament;

    @Pattern(regexp = "AVAILABLE|PENDING|ADOPTED|IN_TREATMENT|DECEASED",
             message = "status must be AVAILABLE, PENDING, ADOPTED, IN_TREATMENT, or DECEASED")
    private String status;

    private LocalDate intakeDate;
    private String description;
    private String imageUrl;
    private UUID previousOwnerId;
}
