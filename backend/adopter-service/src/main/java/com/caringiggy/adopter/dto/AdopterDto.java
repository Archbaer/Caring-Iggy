package com.caringiggy.adopter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdopterDto {
    private UUID id;
    private String name;
    private String telephone;
    private String email;
    private String address;
    private String status;
    private Map<String, Object> preferences;
    private List<UUID> interestedAnimals;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
