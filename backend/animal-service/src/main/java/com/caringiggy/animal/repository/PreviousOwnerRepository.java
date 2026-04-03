package com.caringiggy.animal.repository;

import com.caringiggy.animal.model.PreviousOwner;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class PreviousOwnerRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<PreviousOwner> rowMapper = (rs, rowNum) -> PreviousOwner.builder()
            .id(rs.getObject("id", UUID.class))
            .name(rs.getString("name"))
            .telephone(rs.getString("telephone"))
            .email(rs.getString("email"))
            .address(rs.getString("address"))
            .createdAt(getLocalDateTime(rs.getTimestamp("created_at")))
            .updatedAt(getLocalDateTime(rs.getTimestamp("updated_at")))
            .build();

    private LocalDateTime getLocalDateTime(Timestamp timestamp) {
        return timestamp != null ? timestamp.toLocalDateTime() : null;
    }

    public List<PreviousOwner> findAll() {
        String sql = "SELECT * FROM previous_owners ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, rowMapper);
    }

    public Optional<PreviousOwner> findById(UUID id) {
        String sql = "SELECT * FROM previous_owners WHERE id = ?";
        return jdbcTemplate.query(sql, rowMapper, id).stream().findFirst();
    }

    public Optional<PreviousOwner> findByNameAndTelephone(String name, String telephone) {
        String sql = "SELECT * FROM previous_owners WHERE LOWER(name) = LOWER(?) AND telephone = ?";
        return jdbcTemplate.query(sql, rowMapper, name, telephone).stream().findFirst();
    }

    public PreviousOwner save(PreviousOwner owner) {
        if (owner.getId() == null) {
            return insert(owner);
        }
        return update(owner);
    }

    private PreviousOwner insert(PreviousOwner owner) {
        String sql = """
            INSERT INTO previous_owners (name, telephone, email, address)
            VALUES (?, ?, ?, ?)
            """;
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, owner.getName());
            ps.setString(2, owner.getTelephone());
            ps.setString(3, owner.getEmail());
            ps.setString(4, owner.getAddress());
            return ps;
        }, keyHolder);

        UUID generatedId = keyHolder.getKeyAs(UUID.class);
        owner.setId(generatedId);
        return findById(generatedId).orElse(owner);
    }

    private PreviousOwner update(PreviousOwner owner) {
        String sql = """
            UPDATE previous_owners SET
                name = ?, telephone = ?, email = ?, address = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """;
        
        jdbcTemplate.update(sql, owner.getName(), owner.getTelephone(), owner.getEmail(), owner.getAddress(), owner.getId());
        return findById(owner.getId()).orElse(owner);
    }

    public void deleteById(UUID id) {
        jdbcTemplate.update("DELETE FROM previous_owners WHERE id = ?", id);
    }
}
