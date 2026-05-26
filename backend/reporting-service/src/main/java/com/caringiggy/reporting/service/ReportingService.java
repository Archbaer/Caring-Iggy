package com.caringiggy.reporting.service;

import com.caringiggy.reporting.dto.AdoptionReport;
import com.caringiggy.reporting.dto.IntakeReport;
import com.caringiggy.reporting.dto.SummaryReport;
import com.caringiggy.reporting.feign.AdopterServiceClient;
import com.caringiggy.reporting.feign.AnimalServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Reporting release guardrail.
 *
 * Keep future repair work backend-only. Intake reporting must honor the upstream
 * `intakeDate` payload semantics, and adoption reporting must filter by month using
 * a reliable adoption date or adoption-history source.
 */
@Slf4j
@Service
public class ReportingService {

    private final AnimalServiceClient animalServiceClient;
    private final AdopterServiceClient adopterServiceClient;

    public ReportingService(AnimalServiceClient animalServiceClient, AdopterServiceClient adopterServiceClient) {
        this.animalServiceClient = animalServiceClient;
        this.adopterServiceClient = adopterServiceClient;
    }

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

        SummaryReport report = new SummaryReport();
        report.setTotalAnimals(animals.size());
        report.setTotalAdopters(adopters.size());
        report.setAvailableAnimals(available);
        report.setAdoptedAnimals(adopted);
        report.setPendingAnimals(pending);
        report.setAnimalsByType(animalsByType);
        report.setAnimalsByStatus(animalsByStatus);
        return report;
    }

    public IntakeReport getIntakeReport(String month) {
        YearMonth targetMonth = YearMonth.parse(month);
        List<Map<String, Object>> animals = animalServiceClient.getAllAnimals();

        Map<String, Long> byType = new HashMap<>();
        Map<String, Long> byStatus = new HashMap<>();
        long total = 0;

        for (Map<String, Object> animal : animals) {
            Object rawDate = animal.get("intakeDate");
            if (rawDate == null || rawDate.toString().isBlank()) {
                log.warn("Animal {} missing intakeDate, skipping", animal.get("id"));
                continue;
            }
            try {
                YearMonth animalMonth = YearMonth.from(LocalDate.parse(rawDate.toString()));
                if (!animalMonth.equals(targetMonth)) continue;
            } catch (DateTimeParseException e) {
                log.warn("Animal {} has unparseable intakeDate '{}', skipping", animal.get("id"), rawDate);
                continue;
            }
            total++;
            String type = animal.getOrDefault("animalType", "UNKNOWN").toString();
            String status = animal.getOrDefault("status", "UNKNOWN").toString();
            byType.merge(type, 1L, Long::sum);
            byStatus.merge(status, 1L, Long::sum);
        }

        IntakeReport report = new IntakeReport();
        report.setMonth(month);
        report.setTotalIntake(total);
        report.setByType(byType);
        report.setByStatus(byStatus);
        return report;
    }

    public AdoptionReport getAdoptionReport(String month) {
        List<Map<String, Object>> adoptions = adopterServiceClient.getAdoptionHistoryByMonth(month);

        AdoptionReport report = new AdoptionReport();
        report.setMonth(month);
        report.setTotalAdoptions(adoptions.size());
        report.setByType(new HashMap<>());

        if (adoptions.isEmpty()) {
            return report;
        }

        // Build animalId → animalType lookup from animal-service
        Map<String, String> typeById = new HashMap<>();
        for (Map<String, Object> animal : animalServiceClient.getAllAnimals()) {
            Object id = animal.get("id");
            Object type = animal.get("animalType");
            if (id != null) {
                typeById.put(id.toString(), type != null ? type.toString() : "UNKNOWN");
            }
        }

        Map<String, Long> byType = new HashMap<>();
        for (Map<String, Object> adoption : adoptions) {
            Object animalId = adoption.get("animalId");
            String type = animalId != null
                    ? typeById.getOrDefault(animalId.toString(), "UNKNOWN")
                    : "UNKNOWN";
            byType.merge(type, 1L, Long::sum);
        }

        report.setByType(byType);
        return report;
    }
}
