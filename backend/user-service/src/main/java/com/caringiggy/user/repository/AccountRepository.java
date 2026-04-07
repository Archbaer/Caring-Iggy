package com.caringiggy.user.repository;

import com.caringiggy.user.model.Account;
import com.caringiggy.user.model.AccountRole;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class AccountRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Account> rowMapper = (rs, rowNum) -> mapAccount(rs);

    public Optional<Account> findById(UUID id) {
        return jdbcTemplate.query("""
                SELECT id, email, password_hash, role, profile_id, created_at, updated_at
                FROM accounts
                WHERE id = ?
                """, rowMapper, id).stream().findFirst();
    }

    public Optional<Account> findByEmail(String email) {
        return jdbcTemplate.query("""
                SELECT id, email, password_hash, role, profile_id, created_at, updated_at
                FROM accounts
                WHERE lower(email) = lower(?)
                """, rowMapper, email).stream().findFirst();
    }

    public List<Account> findAllByRole(AccountRole role) {
        return jdbcTemplate.query("""
                SELECT id, email, password_hash, role, profile_id, created_at, updated_at
                FROM accounts
                WHERE role = ?
                ORDER BY created_at DESC
                """, rowMapper, role.name());
    }

    public Account insert(Account account) {
        UUID id = jdbcTemplate.queryForObject("""
                INSERT INTO accounts (email, password_hash, role, profile_id)
                VALUES (?, ?, ?, ?)
                RETURNING id
                """, UUID.class,
                account.getEmail(),
                account.getPasswordHash(),
                account.getRole().name(),
                account.getProfileId());
        return findById(id).orElseThrow();
    }

    public Account updateProfileId(UUID accountId, UUID profileId) {
        jdbcTemplate.update("""
                UPDATE accounts
                SET profile_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """, profileId, accountId);
        return findById(accountId).orElseThrow();
    }

    private Account mapAccount(ResultSet rs) throws SQLException {
        return Account.builder()
                .id(rs.getObject("id", UUID.class))
                .email(rs.getString("email"))
                .passwordHash(rs.getString("password_hash"))
                .role(AccountRole.valueOf(rs.getString("role")))
                .profileId(rs.getObject("profile_id", UUID.class))
                .createdAt(getLocalDateTime(rs.getTimestamp("created_at")))
                .updatedAt(getLocalDateTime(rs.getTimestamp("updated_at")))
                .build();
    }

    private LocalDateTime getLocalDateTime(Timestamp timestamp) {
        return timestamp != null ? timestamp.toLocalDateTime() : null;
    }
}
