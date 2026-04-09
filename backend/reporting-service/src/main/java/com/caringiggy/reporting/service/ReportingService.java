package com.caringiggy.reporting.service;

import com.caringiggy.reporting.dto.AdoptionReport;
import com.caringiggy.reporting.dto.IntakeReport;
import com.caringiggy.reporting.dto.SummaryReport;
import com.caringiggy.reporting.feign.AdopterServiceClient;
import com.caringiggy.reporting.feign.AnimalServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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

    /**
     * Intake report filtered by month.
     *
     * CORRECTION NOTES (reporting backend - UI deferred/out of release scope):
     * - Intake reporting must use the upstream `intakeDate` payload semantics, not a raw
     *   string prefix match.
     * - Current filtering relies on String.startsWith(month) against the raw intakeDate field.
     *   That only works if intakeDate happens to be formatted as "YYYY-MM-DD" or "YYYY-MM".
     *   Repair path: parse intakeDate as LocalDate/YearMonth and compare by year-month.
     * - Intake payloads from animal-service must reliably contain an "intakeDate" field.
     *   If the field name or format changes, this filter can silently return zero results.
     *   Add a null/empty guard and log a warning when intakeDate is missing.
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

        IntakeReport report = new IntakeReport();
        report.setMonth(month);
        report.setTotalIntake(total);
        report.setByType(byType);
        report.setByStatus(byStatus);
        return report;
    }

    /**
     * Adoption report filtered by month.
     *
     * CORRECTION NOTES (reporting backend - UI deferred/out of release scope):
     * - BUG: The month parameter is accepted but NEVER used. The current loop counts ALL
     *   animals with status="ADOPTED" regardless of when they were adopted.
     * - FIX REQUIRED: adoption reporting must filter by month using a reliable adoption
     *   date or adoption-history source, not status alone.
     * - Repair options:
     *   a) If animal-service provides an "adoptionDate" or "adoptedAt" field, parse it and
     *      compare by YearMonth, matching the intake-report repair pattern.
     *   b) If adoption history lives in a separate adoption-events table or service, query
     *      that source with a month range filter instead of scanning all animals.
     *   c) If no adoption date exists, derive the adoption month from status transition
     *      history, using the timestamp of the last change to ADOPTED.
     * - Until one of these fixes is applied, this endpoint returns cumulative adoptions,
     *   not month-scoped data. The "month" field in the response is informational only.
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

        AdoptionReport report = new AdoptionReport();
        report.setMonth(month);
        report.setTotalAdoptions(total);
        report.setByType(byType);
        return report;
    }
}
