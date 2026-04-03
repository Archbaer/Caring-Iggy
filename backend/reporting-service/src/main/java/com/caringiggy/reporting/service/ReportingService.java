package com.caringiggy.reporting.service;

import com.caringiggy.reporting.dto.AdoptionReport;
import com.caringiggy.reporting.dto.IntakeReport;
import com.caringiggy.reporting.dto.SummaryReport;
import com.caringiggy.reporting.feign.AdopterServiceClient;
import com.caringiggy.reporting.feign.AnimalServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportingService {

    private final AnimalServiceClient animalServiceClient;
    private final AdopterServiceClient adopterServiceClient;

    public SummaryReport getSummary() {
        List<Map<String, Object>> animals = animalServiceClient.getAllAnimals();
        List<Map<String, Object>> adopters = adopterServiceClient.getAllAdopters();

        Map<String, Long> animalsByType = new HashMap<>();
        Map<String, Long> animalsByStatus = new HashMap<>();
        long available = 0, adopted = 0, pending = 0;

        for (Map<String, Object> animal : animals) {
            String type = (String) animal.getOrDefault("animalType", "UNKNOWN");
            String status = (String) animal.getOrDefault("status", "UNKNOWN");
            
            animalsByType.merge(type, 1L, Long::sum);
            animalsByStatus.merge(status, 1L, Long::sum);
            
            if ("AVAILABLE".equals(status)) available++;
            else if ("ADOPTED".equals(status)) adopted++;
            else if ("PENDING".equals(status)) pending++;
        }

        return SummaryReport.builder()
                .totalAnimals(animals.size())
                .totalAdopters(adopters.size())
                .availableAnimals(available)
                .adoptedAnimals(adopted)
                .pendingAnimals(pending)
                .animalsByType(animalsByType)
                .animalsByStatus(animalsByStatus)
                .build();
    }

    public IntakeReport getIntakeReport(String month) {
        List<Map<String, Object>> animals = animalServiceClient.getAllAnimals();
        
        Map<String, Long> byType = new HashMap<>();
        Map<String, Long> byStatus = new HashMap<>();
        long total = 0;

        for (Map<String, Object> animal : animals) {
            String intakeDate = String.valueOf(animal.getOrDefault("intakeDate", ""));
            if (intakeDate.startsWith(month)) {
                total++;
                String type = (String) animal.getOrDefault("animalType", "UNKNOWN");
                String status = (String) animal.getOrDefault("status", "UNKNOWN");
                byType.merge(type, 1L, Long::sum);
                byStatus.merge(status, 1L, Long::sum);
            }
        }

        return IntakeReport.builder()
                .month(month)
                .totalIntake(total)
                .byType(byType)
                .byStatus(byStatus)
                .build();
    }

    public AdoptionReport getAdoptionReport(String month) {
        List<Map<String, Object>> animals = animalServiceClient.getAllAnimals();
        
        Map<String, Long> byType = new HashMap<>();
        long total = 0;

        for (Map<String, Object> animal : animals) {
            String status = (String) animal.getOrDefault("status", "");
            if ("ADOPTED".equals(status)) {
                total++;
                String type = (String) animal.getOrDefault("animalType", "UNKNOWN");
                byType.merge(type, 1L, Long::sum);
            }
        }

        return AdoptionReport.builder()
                .month(month)
                .totalAdoptions(total)
                .byType(byType)
                .build();
    }
}
