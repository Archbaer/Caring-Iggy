package com.caringiggy.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDto {
    private UUID id;
    private String name;
    private String email;
    private String telephone;
    private String role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
