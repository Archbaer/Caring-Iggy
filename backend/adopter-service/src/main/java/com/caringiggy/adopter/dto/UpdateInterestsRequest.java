package com.caringiggy.adopter.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateInterestsRequest {
    @Size(max = 3, message = "Maximum 3 animals allowed")
    private List<UUID> interestedAnimals;
}
