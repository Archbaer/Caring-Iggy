package com.caringiggy.animal.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAnimalRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @PastOrPresent(message = "dateOfBirth must not be in the future")
    private LocalDate dateOfBirth;

    @Pattern(regexp = "(?i)DOG|CAT|BIRD", message = "animalType must be DOG, CAT, or BIRD")
    private String animalType;

    private String breed;

    @Pattern(regexp = "(?i)MALE|FEMALE|UNKNOWN", message = "gender must be MALE, FEMALE, or UNKNOWN")
    private String gender;

    @Pattern(regexp = "(?i)SMALL|MEDIUM|LARGE", message = "size must be SMALL, MEDIUM, or LARGE")
    private String size;

    private String temperament;

    @Pattern(regexp = "(?i)AVAILABLE|PENDING|ADOPTED|IN_TREATMENT|DECEASED",
             message = "status must be AVAILABLE, PENDING, ADOPTED, IN_TREATMENT, or DECEASED")
    private String status;

    @PastOrPresent(message = "intakeDate must not be in the future")
    private LocalDate intakeDate;

    private String description;
    private String imageUrl;

    @Valid
    private PreviousOwnerRequest previousOwner;
}
