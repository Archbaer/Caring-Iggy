package com.caringiggy.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntakeReport {
    private String month;
    private long totalIntake;
    private Map<String, Long> byType;
    private Map<String, Long> byStatus;
}
