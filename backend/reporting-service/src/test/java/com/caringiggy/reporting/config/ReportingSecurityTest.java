package com.caringiggy.reporting.config;

import com.caringiggy.reporting.controller.ReportingController;
import com.caringiggy.reporting.dto.SummaryReport;
import com.caringiggy.reporting.service.ReportingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReportingController.class)
@Import(SecurityConfig.class)
class ReportingSecurityTest {

    @Autowired MockMvc mvc;
    @MockBean ReportingService reportingService;

    @Test
    void noTokenIsUnauthorized() throws Exception {
        mvc.perform(get("/api/reports/summary")).andExpect(status().isUnauthorized());
    }

    @Test
    void adopterIsForbidden() throws Exception {
        mvc.perform(get("/api/reports/summary")
                .with(jwt().jwt(j -> j.claim("role", "ADOPTER")).authorities(() -> "ROLE_ADOPTER")))
           .andExpect(status().isForbidden());
    }

    @Test
    void staffPassesSecurity() throws Exception {
        when(reportingService.getSummary()).thenReturn(SummaryReport.builder().build());

        mvc.perform(get("/api/reports/summary")
                .with(jwt().jwt(j -> j.claim("role", "STAFF")).authorities(() -> "ROLE_STAFF")))
           .andExpect(status().is2xxSuccessful());
    }
}
