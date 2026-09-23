package com.caringiggy.animal.repository;

import com.caringiggy.animal.model.PreviousOwner;
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
class PreviousOwnerRepositoryTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private ResultSet resultSet;

    private PreviousOwnerRepository previousOwnerRepository;

    @BeforeEach
    void setUp() throws Exception {
        previousOwnerRepository = PreviousOwnerRepository.class.getDeclaredConstructor(JdbcTemplate.class).newInstance(jdbcTemplate);
    }

    @Test
    void save_insertRequestsOnlyIdGeneratedColumn() throws Exception {
        UUID ownerId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        Connection connection = mock(Connection.class);
        PreparedStatement preparedStatement = mock(PreparedStatement.class);

        when(connection.prepareStatement(anyString(), argThat((String[] columns) -> Arrays.equals(columns, new String[]{"id"}))))
                .thenReturn(preparedStatement);
        when(jdbcTemplate.update(any(PreparedStatementCreator.class), any(KeyHolder.class))).thenAnswer(invocation -> {
            PreparedStatementCreator creator = invocation.getArgument(0);
            GeneratedKeyHolder keyHolder = (GeneratedKeyHolder) invocation.getArgument(1);
            creator.createPreparedStatement(connection);
            keyHolder.getKeyList().add(Map.of("id", ownerId));
            return 1;
        });

        stubFindById(ownerId, now);

        PreviousOwner owner = PreviousOwner.class.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(owner, "name", "Taylor");
        ReflectionTestUtils.setField(owner, "telephone", "555-0100");
        ReflectionTestUtils.setField(owner, "email", "taylor@example.com");
        ReflectionTestUtils.setField(owner, "address", "123 Rescue Rd");

        PreviousOwner savedOwner = previousOwnerRepository.save(owner);

        assertThat(ReflectionTestUtils.getField(savedOwner, "id")).isEqualTo(ownerId);
        assertThat(ReflectionTestUtils.getField(savedOwner, "name")).isEqualTo("Taylor");
        verify(connection).prepareStatement(anyString(), argThat((String[] columns) -> Arrays.equals(columns, new String[]{"id"})));
    }

    @SuppressWarnings("unchecked")
    private void stubFindById(UUID ownerId, LocalDateTime now) throws Exception {
        when(resultSet.getObject("id", UUID.class)).thenReturn(ownerId);
        when(resultSet.getString("name")).thenReturn("Taylor");
        when(resultSet.getString("telephone")).thenReturn("555-0100");
        when(resultSet.getString("email")).thenReturn("taylor@example.com");
        when(resultSet.getString("address")).thenReturn("123 Rescue Rd");
        when(resultSet.getTimestamp("created_at")).thenReturn(Timestamp.valueOf(now.minusMinutes(5)));
        when(resultSet.getTimestamp("updated_at")).thenReturn(Timestamp.valueOf(now));

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(ownerId))).thenAnswer(invocation -> {
            RowMapper<PreviousOwner> rowMapper = invocation.getArgument(1);
            return List.of(rowMapper.mapRow(resultSet, 0));
        });
    }
}
