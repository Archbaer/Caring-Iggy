package com.caringiggy.matching.service;

import com.caringiggy.matching.dto.MatchingResponse;
import com.caringiggy.matching.feign.AdopterServiceClient;
import com.caringiggy.matching.feign.AnimalServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchingService {

    private final AnimalServiceClient animalServiceClient;
    private final AdopterServiceClient adopterServiceClient;

    @Value("${matching.enabled:false}")
    private boolean matchingEnabled;

    public MatchingResponse findMatches(String name, String telephone) {
        Map<String, Object> adopter = adopterServiceClient.getAdopterProfileByNameAndTelephone(name, telephone);
        
        if (adopter == null || adopter.isEmpty()) {
            return MatchingResponse.builder()
                    .adopterName(name)
                    .adopterTelephone(telephone)
                    .preferences(Collections.emptyMap())
                    .matchedAnimals(Collections.emptyList())
                    .matchCount(0)
                    .build();
        }

        String adopterName = (String) adopter.get("name");
        String adopterTelephone = (String) adopter.get("telephone");
        Map<String, Object> preferences = extractPreferences(adopter.get("preferences"));

        if (!matchingEnabled) {
            log.info("Matching endpoint requested for adopter {} but matching.enabled=false; returning guarded empty response", adopterName);
            return MatchingResponse.builder()
                    .adopterName(adopterName)
                    .adopterTelephone(adopterTelephone)
                    .preferences(preferences)
                    .matchedAnimals(Collections.emptyList())
                    .matchCount(0)
                    .build();
        }

        List<Map<String, Object>> allAnimals = animalServiceClient.getAnimalsByStatus("AVAILABLE");
        
        List<Map<String, Object>> matchedAnimals = allAnimals.stream()
                .filter(animal -> matchesPreferences(animal, preferences))
                .collect(Collectors.toList());

        log.info("Found {} matches for adopter: {}", matchedAnimals.size(), adopterName);

        return MatchingResponse.builder()
                .adopterName(adopterName)
                .adopterTelephone(adopterTelephone)
                .preferences(preferences)
                .matchedAnimals(matchedAnimals)
                .matchCount(matchedAnimals.size())
                .build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractPreferences(Object preferences) {
        if (preferences instanceof Map<?, ?> preferenceMap) {
            return (Map<String, Object>) preferenceMap;
        }
        return Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    private boolean matchesPreferences(Map<String, Object> animal, Map<String, Object> preferences) {
        if (preferences == null || preferences.isEmpty()) {
            return true;
        }

        if (preferences.containsKey("animalType")) {
            String prefType = ((String) preferences.get("animalType")).toUpperCase();
            String animalType = ((String) animal.get("animalType"));
            if (animalType == null || !animalType.equalsIgnoreCase(prefType)) {
                return false;
            }
        }

        if (preferences.containsKey("breed")) {
            String prefBreed = ((String) preferences.get("breed")).toLowerCase();
            String animalBreed = (String) animal.get("breed");
            if (animalBreed == null || !animalBreed.toLowerCase().contains(prefBreed)) {
                return false;
            }
        }

        if (preferences.containsKey("size")) {
            String prefSize = ((String) preferences.get("size")).toUpperCase();
            String animalSize = (String) animal.get("size");
            if (animalSize == null || !animalSize.equalsIgnoreCase(prefSize)) {
                return false;
            }
        }

        if (preferences.containsKey("temperament")) {
            String prefTemperament = ((String) preferences.get("temperament")).toLowerCase();
            String animalTemperament = (String) animal.get("temperament");
            if (animalTemperament == null || !animalTemperament.toLowerCase().contains(prefTemperament)) {
                return false;
            }
        }

        return true;
    }
}
