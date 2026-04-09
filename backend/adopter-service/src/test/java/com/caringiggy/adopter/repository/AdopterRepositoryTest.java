package com.caringiggy.adopter.repository;

import com.caringiggy.adopter.model.Adopter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdopterRepositoryTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private ResultSet resultSet;

    private AdopterRepository adopterRepository;

    @BeforeEach
    void setUp() {
        adopterRepository = new AdopterRepository(jdbcTemplate, new ObjectMapper());
    }

    @Test
    void findById_hydratesPreferencesAndInterestedAnimals() throws Exception {
        UUID adopterId = UUID.randomUUID();
        UUID interestedAnimalId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();

        stubBaseRow(adopterId, now);
        when(resultSet.getString("preferences")).thenReturn("{\"animalType\":\"DOG\",\"size\":\"MEDIUM\"}");
        when(resultSet.getString("interested_animals")).thenReturn(interestedAnimalId.toString());
        stubQuery(adopterId);

        Optional<Adopter> result = adopterRepository.findById(adopterId);

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getPreferences())
                .containsEntry("animalType", "DOG")
                .containsEntry("size", "MEDIUM");
        assertThat(result.orElseThrow().getInterestedAnimals()).containsExactly(interestedAnimalId);
    }

    @Test
    void findById_returnsEmptyPreferencesWhenDatabaseValueIsNull() throws Exception {
        UUID adopterId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();

        stubBaseRow(adopterId, now);
        when(resultSet.getString("preferences")).thenReturn(null);
        when(resultSet.getString("interested_animals")).thenReturn(null);
        stubQuery(adopterId);

        Optional<Adopter> result = adopterRepository.findById(adopterId);

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getPreferences()).isEqualTo(Map.of());
        assertThat(result.orElseThrow().getInterestedAnimals()).isEmpty();
    }

    @SuppressWarnings("unchecked")
    private void stubQuery(UUID adopterId) throws Exception {
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(adopterId))).thenAnswer(invocation -> {
            RowMapper<Adopter> rowMapper = invocation.getArgument(1);
            return List.of(rowMapper.mapRow(resultSet, 0));
        });
    }

    private void stubBaseRow(UUID adopterId, LocalDateTime now) throws Exception {
        when(resultSet.getObject("id", UUID.class)).thenReturn(adopterId);
        when(resultSet.getString("name")).thenReturn("Ava Adopter");
        when(resultSet.getString("telephone")).thenReturn("5550001234");
        when(resultSet.getString("email")).thenReturn("ava@example.com");
        when(resultSet.getString("address")).thenReturn("123 Rescue Rd");
        when(resultSet.getString("status")).thenReturn("ACTIVE");
        when(resultSet.getTimestamp("created_at")).thenReturn(Timestamp.valueOf(now.minusDays(1)));
        when(resultSet.getTimestamp("updated_at")).thenReturn(Timestamp.valueOf(now));
    }
}
