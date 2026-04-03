package com.caringiggy.animal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreviousOwnerRequest {
    @NotBlank(message = "Name is required")
    private String name;
    
    @NotBlank(message = "Telephone is required")
    private String telephone;
    
    private String email;
    private String address;
}
