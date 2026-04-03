package com.caringiggy.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SummaryReport {
    private long totalAnimals;
    private long totalAdopters;
    private long availableAnimals;
    private long adoptedAnimals;
    private long pendingAnimals;
    private Map<String, Long> animalsByType;
    private Map<String, Long> animalsByStatus;
}
