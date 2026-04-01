package com.caringiggy.adopter.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Adopter {
    @Id
    private UUID id;
    
    private String name;
    private String telephone;
    private String email;
    private String address;
    private AdopterStatus status;
    private Map<String, Object> preferences;
    private List<UUID> interestedAnimals;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
