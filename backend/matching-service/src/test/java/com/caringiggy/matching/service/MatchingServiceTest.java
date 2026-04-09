package com.caringiggy.matching.service;

import com.caringiggy.matching.dto.MatchingResponse;
import com.caringiggy.matching.feign.AdopterServiceClient;
import com.caringiggy.matching.feign.AnimalServiceClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchingServiceTest {

    @Mock
    private AnimalServiceClient animalServiceClient;

    @Mock
    private AdopterServiceClient adopterServiceClient;

    private MatchingService matchingService;

    @BeforeEach
    void setUp() {
        matchingService = new MatchingService(animalServiceClient, adopterServiceClient);
    }

    @Test
    void findMatches_returnsGuardedEmptyResponseWhenMatchingDisabled() {
        when(adopterServiceClient.getAdopterProfileByNameAndTelephone("Ava Adopter", "5550001234"))
                .thenReturn(Map.of(
                        "name", "Ava Adopter",
                        "telephone", "5550001234",
                        "preferences", Map.of("animalType", "DOG", "size", "MEDIUM")
                ));
        ReflectionTestUtils.setField(matchingService, "matchingEnabled", false);

        MatchingResponse response = matchingService.findMatches("Ava Adopter", "5550001234");

        assertThat(response.getAdopterName()).isEqualTo("Ava Adopter");
        assertThat(response.getAdopterTelephone()).isEqualTo("5550001234");
        assertThat(response.getPreferences())
                .containsEntry("animalType", "DOG")
                .containsEntry("size", "MEDIUM");
        assertThat(response.getMatchedAnimals()).isEmpty();
        assertThat(response.getMatchCount()).isZero();
        verifyNoInteractions(animalServiceClient);
    }

    @Test
    void findMatches_returnsEmptyResponseWhenAdopterIsMissing() {
        when(adopterServiceClient.getAdopterProfileByNameAndTelephone("Missing", "0000"))
                .thenReturn(Map.of());
        ReflectionTestUtils.setField(matchingService, "matchingEnabled", false);

        MatchingResponse response = matchingService.findMatches("Missing", "0000");

        assertThat(response.getAdopterName()).isEqualTo("Missing");
        assertThat(response.getAdopterTelephone()).isEqualTo("0000");
        assertThat(response.getPreferences()).isEmpty();
        assertThat(response.getMatchedAnimals()).isEmpty();
        assertThat(response.getMatchCount()).isZero();
        verifyNoInteractions(animalServiceClient);
    }

    @Test
    void findMatches_usesAnimalResultsWhenExplicitlyEnabled() {
        when(adopterServiceClient.getAdopterProfileByNameAndTelephone("Ava Adopter", "5550001234"))
                .thenReturn(Map.of(
                        "name", "Ava Adopter",
                        "telephone", "5550001234",
                        "preferences", Map.of("animalType", "DOG")
                ));
        when(animalServiceClient.getAnimalsByStatus("AVAILABLE"))
                .thenReturn(List.of(
                        Map.of("id", "1", "animalType", "DOG", "breed", "Collie"),
                        Map.of("id", "2", "animalType", "CAT", "breed", "Tabby")
                ));
        ReflectionTestUtils.setField(matchingService, "matchingEnabled", true);

        MatchingResponse response = matchingService.findMatches("Ava Adopter", "5550001234");

        assertThat(response.getMatchCount()).isEqualTo(1);
        assertThat(response.getMatchedAnimals()).hasSize(1);
        assertThat(response.getMatchedAnimals().get(0)).containsEntry("animalType", "DOG");
    }
}
