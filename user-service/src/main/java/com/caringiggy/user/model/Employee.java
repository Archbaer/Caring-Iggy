package com.caringiggy.user.model;

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
public class Employee {
    private UUID id;
    private String name;
    private String email;
    private String telephone;
    private EmployeeRole role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
