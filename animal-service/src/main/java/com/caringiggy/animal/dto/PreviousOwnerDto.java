package com.caringiggy.animal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreviousOwnerDto {
    private UUID id;
    private String name;
    private String telephone;
    private String email;
    private String address;
}
