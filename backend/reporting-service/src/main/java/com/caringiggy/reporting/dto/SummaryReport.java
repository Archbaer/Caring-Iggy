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

    public long getTotalAnimals() {
        return totalAnimals;
    }

    public void setTotalAnimals(long totalAnimals) {
        this.totalAnimals = totalAnimals;
    }

    public long getTotalAdopters() {
        return totalAdopters;
    }

    public void setTotalAdopters(long totalAdopters) {
        this.totalAdopters = totalAdopters;
    }

    public long getAvailableAnimals() {
        return availableAnimals;
    }

    public void setAvailableAnimals(long availableAnimals) {
        this.availableAnimals = availableAnimals;
    }

    public long getAdoptedAnimals() {
        return adoptedAnimals;
    }

    public void setAdoptedAnimals(long adoptedAnimals) {
        this.adoptedAnimals = adoptedAnimals;
    }

    public long getPendingAnimals() {
        return pendingAnimals;
    }

    public void setPendingAnimals(long pendingAnimals) {
        this.pendingAnimals = pendingAnimals;
    }

    public Map<String, Long> getAnimalsByType() {
        return animalsByType;
    }

    public void setAnimalsByType(Map<String, Long> animalsByType) {
        this.animalsByType = animalsByType;
    }

    public Map<String, Long> getAnimalsByStatus() {
        return animalsByStatus;
    }

    public void setAnimalsByStatus(Map<String, Long> animalsByStatus) {
        this.animalsByStatus = animalsByStatus;
    }
}
