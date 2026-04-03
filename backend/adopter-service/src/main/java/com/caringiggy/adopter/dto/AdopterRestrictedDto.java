package com.caringiggy.adopter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdopterRestrictedDto {
    private UUID id;
    private String name;
    private String telephone;
    private UUID interestedAnimalId;
}
