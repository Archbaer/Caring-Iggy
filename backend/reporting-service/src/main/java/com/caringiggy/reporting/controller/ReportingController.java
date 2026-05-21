package com.caringiggy.reporting.controller;

import com.caringiggy.reporting.dto.AdoptionReport;
import com.caringiggy.reporting.dto.IntakeReport;
import com.caringiggy.reporting.dto.SummaryReport;
import com.caringiggy.reporting.service.ReportingService;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Validated
public class ReportingController {

    private final ReportingService reportingService;

    @GetMapping("/summary")
    public ResponseEntity<SummaryReport> getSummary() {
        return ResponseEntity.ok(reportingService.getSummary());
    }

    @GetMapping("/intake")
    public ResponseEntity<IntakeReport> getIntakeReport(
            @Pattern(regexp = "\\d{4}-\\d{2}", message = "month must be in YYYY-MM format")
            @RequestParam String month) {
        return ResponseEntity.ok(reportingService.getIntakeReport(month));
    }

    @GetMapping("/adoptions")
    public ResponseEntity<AdoptionReport> getAdoptionReport(
            @Pattern(regexp = "\\d{4}-\\d{2}", message = "month must be in YYYY-MM format")
            @RequestParam String month) {
        return ResponseEntity.ok(reportingService.getAdoptionReport(month));
    }
}
