package com.caringiggy.matching.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchingResponse {
    private String adopterName;
    private String adopterTelephone;
    private Map<String, Object> preferences;
    private List<Map<String, Object>> matchedAnimals;
    private int matchCount;
}
