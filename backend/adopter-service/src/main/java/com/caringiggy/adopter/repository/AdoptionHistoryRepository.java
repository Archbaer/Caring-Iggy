package com.caringiggy.adopter.repository;

import com.caringiggy.adopter.model.AdoptionHistory;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class AdoptionHistoryRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<AdoptionHistory> rowMapper = (rs, rowNum) -> AdoptionHistory.builder()
            .id(rs.getObject("id", UUID.class))
            .adopterId(rs.getObject("adopter_id", UUID.class))
            .animalId(rs.getObject("animal_id", UUID.class))
            .adoptionDate(getLocalDate(rs.getDate("adoption_date")))
            .notes(rs.getString("notes"))
            .createdAt(getLocalDateTime(rs.getTimestamp("created_at")))
            .build();

    private LocalDate getLocalDate(Date date) {
        return date != null ? date.toLocalDate() : null;
    }

    private LocalDateTime getLocalDateTime(Timestamp timestamp) {
        return timestamp != null ? timestamp.toLocalDateTime() : null;
    }

    public List<AdoptionHistory> findByAdopterId(UUID adopterId) {
        String sql = """
            SELECT ah.* FROM adoption_history ah
            WHERE ah.adopter_id = ?
            ORDER BY ah.adoption_date DESC
            """;
        return jdbcTemplate.query(sql, rowMapper, adopterId);
    }

    public List<AdoptionHistory> findByAnimalId(UUID animalId) {
        String sql = """
            SELECT ah.* FROM adoption_history ah
            WHERE ah.animal_id = ?
            ORDER BY ah.adoption_date DESC
            """;
        return jdbcTemplate.query(sql, rowMapper, animalId);
    }

    public AdoptionHistory save(AdoptionHistory history) {
        if (history.getId() == null) {
            return insert(history);
        }
        return update(history);
    }

    private AdoptionHistory insert(AdoptionHistory history) {
        String sql = """
            INSERT INTO adoption_history (adopter_id, animal_id, adoption_date, notes)
            VALUES (?, ?, ?, ?)
            """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[]{"id"});
            ps.setObject(1, history.getAdopterId());
            ps.setObject(2, history.getAnimalId());
            ps.setDate(3, history.getAdoptionDate() != null ? Date.valueOf(history.getAdoptionDate()) : Date.valueOf(LocalDate.now()));
            ps.setString(4, history.getNotes());
            return ps;
        }, keyHolder);

        UUID generatedId = keyHolder.getKeyAs(UUID.class);
        history.setId(generatedId);
        return history;
    }

    private AdoptionHistory update(AdoptionHistory history) {
        String sql = "UPDATE adoption_history SET notes = ? WHERE id = ?";
        jdbcTemplate.update(sql, history.getNotes(), history.getId());
        return history;
    }

    public long countByAdoptionDateBetween(LocalDate start, LocalDate end) {
        String sql = "SELECT COUNT(*) FROM adoption_history WHERE adoption_date BETWEEN ? AND ?";
        Long count = jdbcTemplate.queryForObject(sql, Long.class, Date.valueOf(start), Date.valueOf(end));
        return count != null ? count : 0;
    }

    public long countAll() {
        String sql = "SELECT COUNT(*) FROM adoption_history";
        Long count = jdbcTemplate.queryForObject(sql, Long.class);
        return count != null ? count : 0;
    }
}
