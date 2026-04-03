package com.caringiggy.animal.dto;

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
public class AnimalSummaryDto {
    private UUID id;
    private String name;
    private String animalType;
    private String breed;
    private String status;
    private String imageUrl;
}
