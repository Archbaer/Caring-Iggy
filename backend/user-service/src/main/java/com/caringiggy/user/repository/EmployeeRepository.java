package com.caringiggy.user.repository;

import com.caringiggy.user.model.Employee;
import com.caringiggy.user.model.EmployeeRole;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class EmployeeRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Employee> rowMapper = (rs, rowNum) -> Employee.builder()
            .id(rs.getObject("id", UUID.class))
            .name(rs.getString("name"))
            .email(rs.getString("email"))
            .telephone(rs.getString("telephone"))
            .role(EmployeeRole.valueOf(rs.getString("role")))
            .createdAt(getLocalDateTime(rs.getTimestamp("created_at")))
            .updatedAt(getLocalDateTime(rs.getTimestamp("updated_at")))
            .build();

    private LocalDateTime getLocalDateTime(Timestamp timestamp) {
        return timestamp != null ? timestamp.toLocalDateTime() : null;
    }

    public List<Employee> findAll() {
        String sql = "SELECT id, name, email, telephone, role, created_at, updated_at FROM employees ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, rowMapper);
    }

    public Optional<Employee> findById(UUID id) {
        String sql = "SELECT id, name, email, telephone, role, created_at, updated_at FROM employees WHERE id = ?";
        return jdbcTemplate.query(sql, rowMapper, id).stream().findFirst();
    }

    public Optional<Employee> findByEmail(String email) {
        String sql = "SELECT id, name, email, telephone, role, created_at, updated_at FROM employees WHERE lower(email) = lower(?)";
        return jdbcTemplate.query(sql, rowMapper, email).stream().findFirst();
    }

    public Employee save(Employee employee) {
        if (employee.getId() == null) {
            return insert(employee);
        }
        return update(employee);
    }

    private Employee insert(Employee employee) {
        String sql = "INSERT INTO employees (name, email, telephone, role) VALUES (?, ?, ?, ?) RETURNING id";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, employee.getName());
            ps.setString(2, employee.getEmail());
            ps.setString(3, employee.getTelephone());
            ps.setString(4, (employee.getRole() != null ? employee.getRole() : EmployeeRole.STAFF).name());
            return ps;
        }, keyHolder);

        UUID generatedId = keyHolder.getKeyAs(UUID.class);
        employee.setId(generatedId);
        return findById(generatedId).orElse(employee);
    }

    private Employee update(Employee employee) {
        String sql = "UPDATE employees SET name = ?, email = ?, telephone = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        jdbcTemplate.update(sql, employee.getName(), employee.getEmail(), employee.getTelephone(),
                (employee.getRole() != null ? employee.getRole() : EmployeeRole.STAFF).name(), employee.getId());
        return findById(employee.getId()).orElse(employee);
    }

    public void deleteById(UUID id) {
        jdbcTemplate.update("DELETE FROM employees WHERE id = ?", id);
    }
}
