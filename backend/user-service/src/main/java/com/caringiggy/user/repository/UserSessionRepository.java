package com.caringiggy.user.repository;

import com.caringiggy.user.model.UserSession;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class UserSessionRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<UserSession> rowMapper = (rs, rowNum) -> mapSession(rs);

    public Optional<UserSession> findByTokenHash(String tokenHash) {
        return jdbcTemplate.query("""
                SELECT id, account_id, token_hash, expires_at, created_at, last_accessed_at
                FROM sessions
                WHERE token_hash = ?
                """, rowMapper, tokenHash).stream().findFirst();
    }

    public UserSession insert(UserSession session) {
        UUID id = jdbcTemplate.queryForObject("""
                INSERT INTO sessions (account_id, token_hash, expires_at)
                VALUES (?, ?, ?)
                RETURNING id
                """, UUID.class,
                session.getAccountId(),
                session.getTokenHash(),
                Timestamp.valueOf(session.getExpiresAt()));
        return findById(id).orElseThrow();
    }

    public Optional<UserSession> findById(UUID id) {
        return jdbcTemplate.query("""
                SELECT id, account_id, token_hash, expires_at, created_at, last_accessed_at
                FROM sessions
                WHERE id = ?
                """, rowMapper, id).stream().findFirst();
    }

    public void touch(UUID id) {
        jdbcTemplate.update("UPDATE sessions SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?", id);
    }

    public void deleteByTokenHash(String tokenHash) {
        jdbcTemplate.update("DELETE FROM sessions WHERE token_hash = ?", tokenHash);
    }

    public void deleteExpiredSessions() {
        jdbcTemplate.update("DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP");
    }

    private UserSession mapSession(ResultSet rs) throws SQLException {
        return UserSession.builder()
                .id(rs.getObject("id", UUID.class))
                .accountId(rs.getObject("account_id", UUID.class))
                .tokenHash(rs.getString("token_hash"))
                .expiresAt(getLocalDateTime(rs.getTimestamp("expires_at")))
                .createdAt(getLocalDateTime(rs.getTimestamp("created_at")))
                .lastAccessedAt(getLocalDateTime(rs.getTimestamp("last_accessed_at")))
                .build();
    }

    private LocalDateTime getLocalDateTime(Timestamp timestamp) {
        return timestamp != null ? timestamp.toLocalDateTime() : null;
    }
}
