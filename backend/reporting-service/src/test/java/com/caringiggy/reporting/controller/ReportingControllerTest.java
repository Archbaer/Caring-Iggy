package com.caringiggy.reporting.controller;

import com.caringiggy.reporting.dto.AdoptionReport;
import com.caringiggy.reporting.dto.IntakeReport;
import com.caringiggy.reporting.dto.SummaryReport;
import com.caringiggy.reporting.service.ReportingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReportingController.class)
class ReportingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReportingService reportingService;

    @Test
    void getSummary_returns200() throws Exception {
        SummaryReport report = new SummaryReport();
        report.setTotalAnimals(10);
        report.setTotalAdopters(5);
        report.setAvailableAnimals(6);
        report.setAdoptedAnimals(3);
        report.setPendingAnimals(1);
        report.setAnimalsByType(Collections.emptyMap());
        report.setAnimalsByStatus(Collections.emptyMap());

        when(reportingService.getSummary()).thenReturn(report);

        mockMvc.perform(get("/api/reports/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAnimals").value(10));
    }

    @Test
    void getIntakeReport_withValidMonth_returns200() throws Exception {
        IntakeReport report = new IntakeReport();
        report.setMonth("2026-01");
        report.setTotalIntake(3);
        report.setByType(Collections.emptyMap());
        report.setByStatus(Collections.emptyMap());

        when(reportingService.getIntakeReport("2026-01")).thenReturn(report);

        mockMvc.perform(get("/api/reports/intake").param("month", "2026-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.month").value("2026-01"))
                .andExpect(jsonPath("$.totalIntake").value(3));
    }

    @Test
    void getIntakeReport_withInvalidMonthFormat_returns400() throws Exception {
        mockMvc.perform(get("/api/reports/intake").param("month", "Jan-2026"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getIntakeReport_withPartialDate_returns400() throws Exception {
        mockMvc.perform(get("/api/reports/intake").param("month", "2026"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getAdoptionReport_withValidMonth_returns200() throws Exception {
        AdoptionReport report = new AdoptionReport();
        report.setMonth("2026-01");
        report.setTotalAdoptions(2);
        report.setByType(Collections.emptyMap());

        when(reportingService.getAdoptionReport("2026-01")).thenReturn(report);

        mockMvc.perform(get("/api/reports/adoptions").param("month", "2026-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.month").value("2026-01"));
    }

    @Test
    void getAdoptionReport_withInvalidMonthFormat_returns400() throws Exception {
        mockMvc.perform(get("/api/reports/adoptions").param("month", "not-a-date"))
                .andExpect(status().isBadRequest());
    }
}
