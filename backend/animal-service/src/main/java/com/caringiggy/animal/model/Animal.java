package com.caringiggy.animal.model;

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
public class Animal {
    private UUID id;
    private String name;
    private LocalDate dateOfBirth;
    private AnimalType animalType;
    private String breed;
    private AnimalGender gender;
    private AnimalSize size;
    private String temperament;
    private AnimalStatus status;
    private LocalDate intakeDate;
    private String description;
    private String imageUrl;
    private UUID previousOwnerId;
    private LocalDate createdAt;
    private LocalDate updatedAt;
}
