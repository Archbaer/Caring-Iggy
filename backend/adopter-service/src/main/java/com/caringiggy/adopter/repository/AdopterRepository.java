package com.caringiggy.adopter.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.caringiggy.adopter.model.Adopter;
import com.caringiggy.adopter.model.AdopterStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.*;

@Repository
@RequiredArgsConstructor
public class AdopterRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    private final RowMapper<Adopter> adopterRowMapper = (rs, rowNum) -> {
        Adopter adopter = Adopter.builder()
                .id(rs.getObject("id", UUID.class))
                .name(rs.getString("name"))
                .telephone(rs.getString("telephone"))
                .email(rs.getString("email"))
                .address(rs.getString("address"))
                .status(AdopterStatus.valueOf(rs.getString("status")))
                .preferences(parsePreferences(rs.getString("preferences")))
                .createdAt(getLocalDateTime(rs.getTimestamp("created_at")))
                .updatedAt(getLocalDateTime(rs.getTimestamp("updated_at")))
                .build();

        adopter.setInterestedAnimals(parseInterestedAnimals(rs.getString("interested_animals")));

        return adopter;
    };

    private LocalDateTime getLocalDateTime(Timestamp timestamp) {
        return timestamp != null ? timestamp.toLocalDateTime() : null;
    }

    private Map<String, Object> parsePreferences(String preferencesJson) throws SQLException {
        if (preferencesJson == null || preferencesJson.isBlank()) {
            return new LinkedHashMap<>();
        }

        try {
            return objectMapper.readValue(preferencesJson, new TypeReference<>() {});
        } catch (JsonProcessingException exception) {
            throw new SQLException("Failed to parse adopter preferences JSON", exception);
        }
    }

    private List<UUID> parseInterestedAnimals(String interestedAnimalsStr) {
        if (interestedAnimalsStr == null || interestedAnimalsStr.isBlank()) {
            return new ArrayList<>();
        }

        String[] ids = interestedAnimalsStr.replace("{", "").replace("}", "").split(",");
        List<UUID> animals = new ArrayList<>();
        for (String id : ids) {
            if (!id.trim().isEmpty()) {
                animals.add(UUID.fromString(id.trim()));
            }
        }
        return animals;
    }

    public List<Adopter> findAll() {
        String sql = """
            SELECT a.id, a.name, a.telephone, a.email, a.address,
                   ast.name as status, a.preferences,
                   array_to_string(a.interested_animals, ',') as interested_animals,
                   a.created_at, a.updated_at
            FROM adopters a
            JOIN adopter_status ast ON a.status_id = ast.id
            ORDER BY a.created_at DESC
            """;
        return jdbcTemplate.query(sql, adopterRowMapper);
    }

    public Optional<Adopter> findById(UUID id) {
        String sql = """
            SELECT a.id, a.name, a.telephone, a.email, a.address,
                   ast.name as status, a.preferences,
                   array_to_string(a.interested_animals, ',') as interested_animals,
                   a.created_at, a.updated_at
            FROM adopters a
            JOIN adopter_status ast ON a.status_id = ast.id
            WHERE a.id = ?
            """;
        return jdbcTemplate.query(sql, adopterRowMapper, id).stream().findFirst();
    }

    public Optional<Adopter> findByNameAndTelephone(String name, String telephone) {
        String sql = """
            SELECT a.id, a.name, a.telephone, a.email, a.address,
                   ast.name as status, a.preferences,
                   array_to_string(a.interested_animals, ',') as interested_animals,
                   a.created_at, a.updated_at
            FROM adopters a
            JOIN adopter_status ast ON a.status_id = ast.id
            WHERE LOWER(a.name) = LOWER(?) AND a.telephone = ?
            """;
        return jdbcTemplate.query(sql, adopterRowMapper, name, telephone).stream().findFirst();
    }

    public List<Adopter> findByStatus(AdopterStatus status) {
        String sql = """
            SELECT a.id, a.name, a.telephone, a.email, a.address,
                   ast.name as status, a.preferences,
                   array_to_string(a.interested_animals, ',') as interested_animals,
                   a.created_at, a.updated_at
            FROM adopters a
            JOIN adopter_status ast ON a.status_id = ast.id
            WHERE ast.name = ?
            ORDER BY a.created_at DESC
            """;
        return jdbcTemplate.query(sql, adopterRowMapper, status.name());
    }

    public Adopter save(Adopter adopter) {
        if (adopter.getId() == null) {
            return insert(adopter);
        }
        return update(adopter);
    }

    private Adopter insert(Adopter adopter) {
        String sql = """
            INSERT INTO adopters (name, telephone, email, address, status_id, preferences, interested_animals)
            VALUES (?, ?, ?, ?, ?, ?::jsonb, ?)
            """;

        int statusId = adopter.getStatus() != null ? adopter.getStatus().ordinal() + 1 : 1;
        String preferencesJson = adopter.getPreferences() != null ? toJsonString(adopter.getPreferences()) : null;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[]{"id"});
            ps.setString(1, adopter.getName());
            ps.setString(2, adopter.getTelephone());
            ps.setString(3, adopter.getEmail());
            ps.setString(4, adopter.getAddress());
            ps.setInt(5, statusId);
            ps.setString(6, preferencesJson);
            ps.setArray(7, toUuidSqlArray(connection, adopter.getInterestedAnimals()));
            return ps;
        }, keyHolder);

        UUID generatedId = keyHolder.getKeyAs(UUID.class);
        adopter.setId(generatedId);
        return findById(generatedId).orElse(adopter);
    }

    private Adopter update(Adopter adopter) {
        String sql = """
            UPDATE adopters SET
                name = ?, telephone = ?, email = ?, address = ?, status_id = ?,
                preferences = ?::jsonb, interested_animals = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """;

        int statusId = adopter.getStatus() != null ? adopter.getStatus().ordinal() + 1 : 1;
        String preferencesJson = adopter.getPreferences() != null ? toJsonString(adopter.getPreferences()) : null;

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql);
            ps.setString(1, adopter.getName());
            ps.setString(2, adopter.getTelephone());
            ps.setString(3, adopter.getEmail());
            ps.setString(4, adopter.getAddress());
            ps.setInt(5, statusId);
            ps.setString(6, preferencesJson);
            ps.setArray(7, toUuidSqlArray(connection, adopter.getInterestedAnimals()));
            ps.setObject(8, adopter.getId());
            return ps;
        });

        return findById(adopter.getId()).orElse(adopter);
    }

    public void deleteById(UUID id) {
        jdbcTemplate.update("DELETE FROM adopters WHERE id = ?", id);
    }

    public long countByStatus(AdopterStatus status) {
        String sql = "SELECT COUNT(*) FROM adopters a JOIN adopter_status ast ON a.status_id = ast.id WHERE ast.name = ?";
        Long count = jdbcTemplate.queryForObject(sql, Long.class, status.name());
        return count != null ? count : 0;
    }

    public long countAll() {
        String sql = "SELECT COUNT(*) FROM adopters";
        Long count = jdbcTemplate.queryForObject(sql, Long.class);
        return count != null ? count : 0;
    }

    private String toJsonString(Map<String, Object> map) {
        if (map == null) return null;
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (!first) sb.append(",");
            sb.append("\"").append(entry.getKey()).append("\":");
            if (entry.getValue() instanceof String) {
                sb.append("\"").append(entry.getValue()).append("\"");
            } else {
                sb.append(entry.getValue());
            }
            first = false;
        }
        sb.append("}");
        return sb.toString();
    }

    private Array toUuidSqlArray(Connection connection, List<UUID> interestedAnimals) throws SQLException {
        Object[] values = interestedAnimals == null
                ? new Object[0]
                : interestedAnimals.stream().map(UUID::toString).toArray();
        return connection.createArrayOf("uuid", values);
    }
}
