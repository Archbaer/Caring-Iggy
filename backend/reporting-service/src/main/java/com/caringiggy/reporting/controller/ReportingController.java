package com.caringiggy.reporting.controller;

import com.caringiggy.reporting.dto.AdoptionReport;
import com.caringiggy.reporting.dto.IntakeReport;
import com.caringiggy.reporting.dto.SummaryReport;
import com.caringiggy.reporting.service.ReportingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
public class ReportingController {

    private final ReportingService reportingService;

    public ReportingController(ReportingService reportingService) {
        this.reportingService = reportingService;
    }

    @GetMapping("/summary")
    public ResponseEntity<SummaryReport> getSummary() {
        return ResponseEntity.ok(reportingService.getSummary());
    }

    @GetMapping("/intake")
    public ResponseEntity<IntakeReport> getIntakeReport(@RequestParam String month) {
        return ResponseEntity.ok(reportingService.getIntakeReport(month));
    }

    @GetMapping("/adoptions")
    public ResponseEntity<AdoptionReport> getAdoptionReport(@RequestParam String month) {
        return ResponseEntity.ok(reportingService.getAdoptionReport(month));
    }
}
