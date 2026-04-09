package com.caringiggy.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionUserDto {
    private UUID accountId;
    private String role;
    private String profileType;
    private UUID profileId;
}
