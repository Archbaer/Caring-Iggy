package com.caringiggy.adopter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAdopterRequest {
    private String name;
    private String telephone;
    private String email;
    private String address;
    private String status;
    private Map<String, Object> preferences;
}
