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
public class Account {
    private UUID id;
    private String email;
    private String passwordHash;
    private AccountRole role;
    private AccountProfileType profileType;
    private UUID profileId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
