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

    /**
     * Intake report filtered by month.
     *
     * CORRECTION NOTES (reporting backend - UI deferred/out of release scope):
     * - Current filtering relies on String.startsWith(month) against the raw intakeDate field.
     *   This assumes intakeDate is formatted as "YYYY-MM-DD" or "YYYY-MM" at the source.
     *   Safer approach: parse intakeDate as LocalDate/YearMonth and compare by year-month.
     * - Intake payloads from animal-service must reliably contain an "intakeDate" field.
     *   If animal-service schema changes this field name or format, this filter will silently
     *   return zero results. Add a null/empty guard and log a warning when intakeDate is missing.
     *
     * Expected contract:
     *   GET /api/reports/intake?month=2026-04
     *   → returns IntakeReport { month, totalIntake, byType, byStatus }
     *   where only animals with intakeDate falling within the requested month are counted.
     */
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

    /**
     * Adoption report filtered by month.
     *
     * CORRECTION NOTES (reporting backend - UI deferred/out of release scope):
     * - BUG: The month parameter is accepted but NEVER used. The current loop counts ALL
     *   animals with status="ADOPTED" regardless of when they were adopted.
     * - FIX REQUIRED: Filter adoptions by a reliable adoption date field. Options:
     *   a) If animal-service provides an "adoptionDate" or "adoptedAt" field, use it for
     *      month filtering (same YearMonth comparison pattern as intakeDate above).
     *   b) If adoption history is stored in a separate adoption-events table/service, query
     *      that source with a date-range filter instead of scanning all animals.
     *   c) As a fallback, if no adoption date exists, derive it from the animal's status
     *      transition history (e.g., last status change to ADOPTED). This requires the
     *      animal-service to expose status-change timestamps.
     * - Until one of these fixes is applied, this endpoint returns cumulative adoptions,
     *   not month-scoped data. Callers should be aware the "month" field in the response
     *   is informational only and does not reflect actual filtering.
     *
     * Expected contract (after fix):
     *   GET /api/reports/adoptions?month=2026-04
     *   → returns AdoptionReport { month, totalAdoptions, byType }
     *   where only animals adopted within the requested month are counted.
     */
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
