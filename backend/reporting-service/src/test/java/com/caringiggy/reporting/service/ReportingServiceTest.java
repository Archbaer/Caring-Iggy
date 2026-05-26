package com.caringiggy.reporting.service;

import com.caringiggy.reporting.dto.AdoptionReport;
import com.caringiggy.reporting.feign.AdopterServiceClient;
import com.caringiggy.reporting.feign.AnimalServiceClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportingServiceTest {

    @Mock
    private AnimalServiceClient animalServiceClient;

    @Mock
    private AdopterServiceClient adopterServiceClient;

    @InjectMocks
    private ReportingService reportingService;

    // ─── getAdoptionReport ───────────────────────────────────────────────────

    @Test
    void getAdoptionReport_countsOnlyAdoptionsReturnedByAdopterService() {
        UUID dogId = UUID.randomUUID();
        UUID catId = UUID.randomUUID();

        when(adopterServiceClient.getAdoptionHistoryByMonth("2026-01")).thenReturn(List.of(
                adoptionRecord(dogId, "2026-01-10"),
                adoptionRecord(catId, "2026-01-22")
        ));
        when(animalServiceClient.getAllAnimals()).thenReturn(List.of(
                animalRecord(dogId, "DOG"),
                animalRecord(catId, "CAT")
        ));

        AdoptionReport report = reportingService.getAdoptionReport("2026-01");

        assertThat(report.getMonth()).isEqualTo("2026-01");
        assertThat(report.getTotalAdoptions()).isEqualTo(2);
    }

    @Test
    void getAdoptionReport_groupsByAnimalType() {
        UUID dog1 = UUID.randomUUID();
        UUID dog2 = UUID.randomUUID();
        UUID cat1 = UUID.randomUUID();

        when(adopterServiceClient.getAdoptionHistoryByMonth("2026-02")).thenReturn(List.of(
                adoptionRecord(dog1, "2026-02-01"),
                adoptionRecord(dog2, "2026-02-14"),
                adoptionRecord(cat1, "2026-02-20")
        ));
        when(animalServiceClient.getAllAnimals()).thenReturn(List.of(
                animalRecord(dog1, "DOG"),
                animalRecord(dog2, "DOG"),
                animalRecord(cat1, "CAT")
        ));

        AdoptionReport report = reportingService.getAdoptionReport("2026-02");

        assertThat(report.getByType()).containsEntry("DOG", 2L);
        assertThat(report.getByType()).containsEntry("CAT", 1L);
        assertThat(report.getByType()).doesNotContainKey("UNKNOWN");
    }

    @Test
    void getAdoptionReport_withNoAdoptionsInMonth_returnsZeroTotal() {
        // No animal service call expected — nothing to look up when adoption list is empty
        when(adopterServiceClient.getAdoptionHistoryByMonth("2026-03")).thenReturn(List.of());

        AdoptionReport report = reportingService.getAdoptionReport("2026-03");

        assertThat(report.getTotalAdoptions()).isZero();
        assertThat(report.getByType()).isEmpty();
    }

    @Test
    void getAdoptionReport_withAnimalIdNotInAnimalService_groupsAsUnknown() {
        UUID unknownAnimalId = UUID.randomUUID();

        when(adopterServiceClient.getAdoptionHistoryByMonth("2026-04")).thenReturn(List.of(
                adoptionRecord(unknownAnimalId, "2026-04-05")
        ));
        when(animalServiceClient.getAllAnimals()).thenReturn(List.of()); // animal not found

        AdoptionReport report = reportingService.getAdoptionReport("2026-04");

        assertThat(report.getTotalAdoptions()).isEqualTo(1);
        assertThat(report.getByType()).containsEntry("UNKNOWN", 1L);
    }

    @Test
    void getAdoptionReport_monthFieldMatchesRequest() {
        // No animal service call expected — nothing to look up when adoption list is empty
        when(adopterServiceClient.getAdoptionHistoryByMonth("2026-06")).thenReturn(List.of());

        AdoptionReport report = reportingService.getAdoptionReport("2026-06");

        assertThat(report.getMonth()).isEqualTo("2026-06");
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private Map<String, Object> adoptionRecord(UUID animalId, String adoptionDate) {
        return Map.of(
                "animalId", animalId.toString(),
                "adoptionDate", adoptionDate
        );
    }

    private Map<String, Object> animalRecord(UUID id, String animalType) {
        return Map.of(
                "id", id.toString(),
                "animalType", animalType
        );
    }
}
