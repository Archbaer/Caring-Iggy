package com.caringiggy.adopter.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
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

    @Email(message = "Invalid email format")
    private String email;

    private String address;

    @Pattern(regexp = "ACTIVE|PENDING_REVIEW|APPROVED|REJECTED|INACTIVE",
             message = "status must be ACTIVE, PENDING_REVIEW, APPROVED, REJECTED, or INACTIVE")
    private String status;

    private Map<String, Object> preferences;
}
