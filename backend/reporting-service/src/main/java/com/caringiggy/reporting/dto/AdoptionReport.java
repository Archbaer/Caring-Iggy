package com.caringiggy.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdoptionReport {
    private String month;
    private long totalAdoptions;
    private Map<String, Long> byType;
}
