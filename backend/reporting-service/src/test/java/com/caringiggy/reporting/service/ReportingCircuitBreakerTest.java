package com.caringiggy.reporting.service;

import com.caringiggy.reporting.dto.AdoptionReport;
import com.caringiggy.reporting.dto.SummaryReport;
import com.caringiggy.reporting.feign.AdopterServiceClient;
import com.caringiggy.reporting.feign.AnimalServiceClient;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JCircuitBreakerFactory;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportingCircuitBreakerTest {

    @Mock
    private AnimalServiceClient animalServiceClient;

    @Mock
    private AdopterServiceClient adopterServiceClient;

    private ReportingService reportingService;

    @BeforeEach
    void setUp() {
        reportingService = new ReportingService(animalServiceClient, adopterServiceClient,
                new Resilience4JCircuitBreakerFactory(CircuitBreakerRegistry.ofDefaults(),
                        TimeLimiterRegistry.ofDefaults(), null));
    }

    @Test
    void getSummary_whenAnimalClientFails_returnsZeroAnimalCountsWithoutThrowing() {
        when(animalServiceClient.getAllAnimals()).thenThrow(new RuntimeException("animal-service down"));
        when(adopterServiceClient.getAllAdopters()).thenReturn(List.of(Map.of("id", "a1")));

        SummaryReport report = reportingService.getSummary();

        assertThat(report.getTotalAnimals()).isZero();
        assertThat(report.getAvailableAnimals()).isZero();
        assertThat(report.getAdoptedAnimals()).isZero();
        assertThat(report.getPendingAnimals()).isZero();
        assertThat(report.getAnimalsByType()).isEmpty();
        assertThat(report.getAnimalsByStatus()).isEmpty();
        assertThat(report.getTotalAdopters()).isEqualTo(1);
    }

    @Test
    void getAdoptionReport_whenAdopterClientFails_returnsEmptyAdoptionDataWithoutThrowing() {
        when(adopterServiceClient.getAdoptionHistoryByMonth("2026-01"))
                .thenThrow(new RuntimeException("adopter-service down"));

        AdoptionReport report = reportingService.getAdoptionReport("2026-01");

        assertThat(report.getMonth()).isEqualTo("2026-01");
        assertThat(report.getTotalAdoptions()).isZero();
        assertThat(report.getByType()).isEmpty();
    }
}
