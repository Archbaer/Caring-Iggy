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
public class AdoptionReport {
    private String month;
    private long totalAdoptions;
    private Map<String, Long> byType;

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public long getTotalAdoptions() {
        return totalAdoptions;
    }

    public void setTotalAdoptions(long totalAdoptions) {
        this.totalAdoptions = totalAdoptions;
    }

    public Map<String, Long> getByType() {
        return byType;
    }

    public void setByType(Map<String, Long> byType) {
        this.byType = byType;
    }
}
