package com.caringiggy.animal.repository;

import com.caringiggy.animal.model.Animal;
import com.caringiggy.animal.model.AnimalGender;
import com.caringiggy.animal.model.AnimalSize;
import com.caringiggy.animal.model.AnimalStatus;
import com.caringiggy.animal.model.AnimalType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnimalRepositoryTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private ResultSet resultSet;

    private AnimalRepository animalRepository;

    @BeforeEach
    void setUp() throws Exception {
        animalRepository = AnimalRepository.class.getDeclaredConstructor(JdbcTemplate.class).newInstance(jdbcTemplate);
    }

    @Test
    void save_insertRequestsOnlyIdGeneratedColumn() throws Exception {
        UUID animalId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        Connection connection = mock(Connection.class);
        PreparedStatement preparedStatement = mock(PreparedStatement.class);

        when(connection.prepareStatement(anyString(), argThat((String[] columns) -> Arrays.equals(columns, new String[]{"id"}))))
                .thenReturn(preparedStatement);
        when(jdbcTemplate.update(any(PreparedStatementCreator.class), any(KeyHolder.class))).thenAnswer(invocation -> {
            PreparedStatementCreator creator = invocation.getArgument(0);
            GeneratedKeyHolder keyHolder = (GeneratedKeyHolder) invocation.getArgument(1);
            creator.createPreparedStatement(connection);
            keyHolder.getKeyList().add(Map.of("id", animalId));
            return 1;
        });

        stubFindById(animalId, now);

        Animal animal = Animal.class.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(animal, "name", "Mochi");
        ReflectionTestUtils.setField(animal, "dateOfBirth", LocalDate.of(2022, 4, 1));
        ReflectionTestUtils.setField(animal, "animalType", AnimalType.DOG);
        ReflectionTestUtils.setField(animal, "breed", "Shiba Inu");
        ReflectionTestUtils.setField(animal, "gender", AnimalGender.FEMALE);
        ReflectionTestUtils.setField(animal, "size", AnimalSize.MEDIUM);
        ReflectionTestUtils.setField(animal, "temperament", "Friendly");
        ReflectionTestUtils.setField(animal, "status", AnimalStatus.AVAILABLE);
        ReflectionTestUtils.setField(animal, "intakeDate", LocalDate.of(2024, 2, 1));
        ReflectionTestUtils.setField(animal, "description", "Playful");
        ReflectionTestUtils.setField(animal, "imageUrl", "https://example.com/mochi.jpg");

        Animal savedAnimal = animalRepository.save(animal);

        assertThat(ReflectionTestUtils.getField(savedAnimal, "id")).isEqualTo(animalId);
        assertThat(ReflectionTestUtils.getField(savedAnimal, "name")).isEqualTo("Mochi");
        verify(connection).prepareStatement(anyString(), argThat((String[] columns) -> Arrays.equals(columns, new String[]{"id"})));
    }

    @SuppressWarnings("unchecked")
    private void stubFindById(UUID animalId, LocalDateTime now) throws Exception {
        when(resultSet.getObject("id", UUID.class)).thenReturn(animalId);
        when(resultSet.getString("name")).thenReturn("Mochi");
        when(resultSet.getDate("date_of_birth")).thenReturn(java.sql.Date.valueOf(LocalDate.of(2022, 4, 1)));
        when(resultSet.getString("animal_type")).thenReturn("DOG");
        when(resultSet.getString("breed")).thenReturn("Shiba Inu");
        when(resultSet.getInt("gender_id")).thenReturn(2);
        when(resultSet.getInt("size_id")).thenReturn(2);
        when(resultSet.wasNull()).thenReturn(false, false);
        when(resultSet.getString("temperament")).thenReturn("Friendly");
        when(resultSet.getString("status")).thenReturn("AVAILABLE");
        when(resultSet.getDate("intake_date")).thenReturn(java.sql.Date.valueOf(LocalDate.of(2024, 2, 1)));
        when(resultSet.getString("description")).thenReturn("Playful");
        when(resultSet.getString("image_url")).thenReturn("https://example.com/mochi.jpg");
        when(resultSet.getObject("previous_owner_id", UUID.class)).thenReturn(null);
        when(resultSet.getTimestamp("created_at")).thenReturn(Timestamp.valueOf(now.minusMinutes(5)));
        when(resultSet.getTimestamp("updated_at")).thenReturn(Timestamp.valueOf(now));

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(animalId))).thenAnswer(invocation -> {
            RowMapper<Animal> rowMapper = invocation.getArgument(1);
            return List.of(rowMapper.mapRow(resultSet, 0));
        });
    }
}
