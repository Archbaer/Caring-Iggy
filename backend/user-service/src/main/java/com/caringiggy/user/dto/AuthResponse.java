package com.caringiggy.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private SessionUserDto user;
    private String accountId;
    private String role;
    private String profileType;
    private String profileId;
    private long expiresAtEpochSeconds;
}
