package com.caringiggy.animal.dto;

import com.caringiggy.animal.model.AnimalGender;
import com.caringiggy.animal.model.AnimalSize;
import com.caringiggy.animal.model.AnimalStatus;
import com.caringiggy.animal.model.AnimalType;
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
public class AnimalDto {
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
}
