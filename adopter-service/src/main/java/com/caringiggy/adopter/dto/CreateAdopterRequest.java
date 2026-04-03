package com.caringiggy.adopter.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAdopterRequest {
    @NotBlank(message = "Name is required")
    private String name;
    
    @NotBlank(message = "Telephone is required")
    private String telephone;
    
    private String email;
    private String address;
    private String status;
    private Map<String, Object> preferences;
    private List<String> interestedAnimals;
}
