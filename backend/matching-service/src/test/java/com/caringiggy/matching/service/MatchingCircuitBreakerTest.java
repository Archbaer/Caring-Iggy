package com.caringiggy.matching.service;

import com.caringiggy.matching.dto.MatchingResponse;
import com.caringiggy.matching.feign.AdopterServiceClient;
import com.caringiggy.matching.feign.AnimalServiceClient;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JCircuitBreakerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchingCircuitBreakerTest {

    @Mock
    private AnimalServiceClient animalServiceClient;

    @Mock
    private AdopterServiceClient adopterServiceClient;

    private MatchingService matchingService;

    @BeforeEach
    void setUp() {
        Resilience4JCircuitBreakerFactory circuitBreakerFactory = new Resilience4JCircuitBreakerFactory(
                CircuitBreakerRegistry.ofDefaults(), TimeLimiterRegistry.ofDefaults(), null);
        matchingService = new MatchingService(animalServiceClient, adopterServiceClient, circuitBreakerFactory);
    }

    @Test
    void findMatches_returnsDegradedResponseWhenAdopterClientFails() {
        when(adopterServiceClient.getAdopterProfileByNameAndTelephone("a", "1"))
                .thenThrow(new RuntimeException("adopter-service down"));

        MatchingResponse response = matchingService.findMatches("a", "1");

        assertThat(response).isNotNull();
        assertThat(response.getMatchedAnimals()).isEmpty();
        assertThat(response.getMatchCount()).isZero();
    }

    @Test
    void findMatches_returnsZeroMatchesWhenAnimalClientFails() {
        when(adopterServiceClient.getAdopterProfileByNameAndTelephone("a", "1"))
                .thenReturn(Map.of(
                        "name", "a",
                        "telephone", "1",
                        "preferences", Map.of("animalType", "DOG")
                ));
        when(animalServiceClient.getAnimalsByStatus("AVAILABLE"))
                .thenThrow(new RuntimeException("animal-service down"));
        ReflectionTestUtils.setField(matchingService, "matchingEnabled", true);

        MatchingResponse response = matchingService.findMatches("a", "1");

        assertThat(response).isNotNull();
        assertThat(response.getMatchedAnimals()).isEmpty();
        assertThat(response.getMatchCount()).isZero();
    }
}
