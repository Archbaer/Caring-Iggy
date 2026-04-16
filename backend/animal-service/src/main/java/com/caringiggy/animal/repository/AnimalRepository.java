package com.caringiggy.animal.repository;

import com.caringiggy.animal.model.Animal;
import com.caringiggy.animal.model.AnimalStatus;
import com.caringiggy.animal.model.AnimalType;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class AnimalRepository {

    private static final String[] GENERATED_ID_COLUMN = {"id"};

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Animal> animalRowMapper = (rs, rowNum) -> Animal.builder()
            .id(rs.getObject("id", UUID.class))
            .name(rs.getString("name"))
            .dateOfBirth(getLocalDate(rs.getDate("date_of_birth")))
            .animalType(AnimalType.valueOf(rs.getString("animal_type")))
            .breed(rs.getString("breed"))
            .gender(getEnumOrNull(rs, "gender", "gender_id"))
            .size(getEnumOrNull(rs, "size", "size_id"))
            .temperament(rs.getString("temperament"))
            .status(AnimalStatus.valueOf(rs.getString("status")))
            .intakeDate(getLocalDate(rs.getDate("intake_date")))
            .description(rs.getString("description"))
            .imageUrl(rs.getString("image_url"))
            .previousOwnerId(rs.getObject("previous_owner_id", UUID.class))
            .createdAt(getLocalDateTime(rs.getTimestamp("created_at")))
            .updatedAt(getLocalDateTime(rs.getTimestamp("updated_at")))
            .build();

    private LocalDate getLocalDate(Date date) {
        return date != null ? date.toLocalDate() : null;
    }

    private java.time.LocalDateTime getLocalDateTime(java.sql.Timestamp timestamp) {
        return timestamp != null ? timestamp.toLocalDateTime() : null;
    }

    private <T extends Enum<T>> T getEnumOrNull(ResultSet rs, String enumName, String columnPrefix) throws SQLException {
        int typeId = rs.getInt(columnPrefix);
        if (rs.wasNull()) {
            return null;
        }
        return switch (enumName.toLowerCase()) {
            case "gender" -> (T) java.util.Arrays.stream(com.caringiggy.animal.model.AnimalGender.values())
                    .filter(e -> e.ordinal() + 1 == typeId)
                    .findFirst().orElse(null);
            case "size" -> (T) java.util.Arrays.stream(com.caringiggy.animal.model.AnimalSize.values())
                    .filter(e -> e.ordinal() + 1 == typeId)
                    .findFirst().orElse(null);
            default -> null;
        };
    }

    public List<Animal> findAll() {
        String sql = """
            SELECT a.id, a.name, a.date_of_birth, at.name as animal_type, a.breed,
                   a.gender_id, a.size_id, a.temperament, ast.name as status,
                   a.intake_date, a.description, a.image_url, a.previous_owner_id,
                   a.created_at, a.updated_at
            FROM animals a
            JOIN animal_type at ON a.animal_type_id = at.id
            JOIN animal_status ast ON a.status_id = ast.id
            ORDER BY a.created_at DESC
            """;
        return jdbcTemplate.query(sql, animalRowMapper);
    }

    public Optional<Animal> findById(UUID id) {
        String sql = """
            SELECT a.id, a.name, a.date_of_birth, at.name as animal_type, a.breed,
                   a.gender_id, a.size_id, a.temperament, ast.name as status,
                   a.intake_date, a.description, a.image_url, a.previous_owner_id,
                   a.created_at, a.updated_at
            FROM animals a
            JOIN animal_type at ON a.animal_type_id = at.id
            JOIN animal_status ast ON a.status_id = ast.id
            WHERE a.id = ?
            """;
        return jdbcTemplate.query(sql, animalRowMapper, id).stream().findFirst();
    }

    public List<Animal> findByStatus(AnimalStatus status) {
        String sql = """
            SELECT a.id, a.name, a.date_of_birth, at.name as animal_type, a.breed,
                   a.gender_id, a.size_id, a.temperament, ast.name as status,
                   a.intake_date, a.description, a.image_url, a.previous_owner_id,
                   a.created_at, a.updated_at
            FROM animals a
            JOIN animal_type at ON a.animal_type_id = at.id
            JOIN animal_status ast ON a.status_id = ast.id
            WHERE ast.name = ?
            ORDER BY a.created_at DESC
            """;
        return jdbcTemplate.query(sql, animalRowMapper, status.name());
    }

    public List<Animal> findByType(AnimalType type) {
        String sql = """
            SELECT a.id, a.name, a.date_of_birth, at.name as animal_type, a.breed,
                   a.gender_id, a.size_id, a.temperament, ast.name as status,
                   a.intake_date, a.description, a.image_url, a.previous_owner_id,
                   a.created_at, a.updated_at
            FROM animals a
            JOIN animal_type at ON a.animal_type_id = at.id
            JOIN animal_status ast ON a.status_id = ast.id
            WHERE at.name = ?
            ORDER BY a.created_at DESC
            """;
        return jdbcTemplate.query(sql, animalRowMapper, type.name());
    }

    public List<Animal> findByStatusAndType(AnimalStatus status, AnimalType type) {
        String sql = """
            SELECT a.id, a.name, a.date_of_birth, at.name as animal_type, a.breed,
                   a.gender_id, a.size_id, a.temperament, ast.name as status,
                   a.intake_date, a.description, a.image_url, a.previous_owner_id,
                   a.created_at, a.updated_at
            FROM animals a
            JOIN animal_type at ON a.animal_type_id = at.id
            JOIN animal_status ast ON a.status_id = ast.id
            WHERE ast.name = ? AND at.name = ?
            ORDER BY a.created_at DESC
            """;
        return jdbcTemplate.query(sql, animalRowMapper, status.name(), type.name());
    }

    public Animal save(Animal animal) {
        if (animal.getId() == null) {
            return insert(animal);
        }
        return update(animal);
    }

    private Animal insert(Animal animal) {
        String sql = """
            INSERT INTO animals (name, date_of_birth, animal_type_id, breed, gender_id, size_id,
                               temperament, status_id, intake_date, description, image_url, previous_owner_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, GENERATED_ID_COLUMN);
            ps.setString(1, animal.getName());
            ps.setDate(2, animal.getDateOfBirth() != null ? Date.valueOf(animal.getDateOfBirth()) : null);
            ps.setInt(3, animal.getAnimalType() != null ? animal.getAnimalType().ordinal() + 1 : 1);
            ps.setString(4, animal.getBreed());
            ps.setInt(5, animal.getGender() != null ? animal.getGender().ordinal() + 1 : 3);
            ps.setInt(6, animal.getSize() != null ? animal.getSize().ordinal() + 1 : 2);
            ps.setString(7, animal.getTemperament());
            ps.setInt(8, animal.getStatus() != null ? animal.getStatus().ordinal() + 1 : 1);
            ps.setDate(9, animal.getIntakeDate() != null ? Date.valueOf(animal.getIntakeDate()) : Date.valueOf(LocalDate.now()));
            ps.setString(10, animal.getDescription());
            ps.setString(11, animal.getImageUrl());
            ps.setObject(12, animal.getPreviousOwnerId());
            return ps;
        }, keyHolder);

        UUID generatedId = keyHolder.getKeyAs(UUID.class);
        animal.setId(generatedId);
        return findById(generatedId).orElse(animal);
    }

    private Animal update(Animal animal) {
        String sql = """
            UPDATE animals SET
                name = ?, date_of_birth = ?, animal_type_id = ?, breed = ?, gender_id = ?,
                size_id = ?, temperament = ?, status_id = ?, intake_date = ?, description = ?,
                image_url = ?, previous_owner_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """;
        
        jdbcTemplate.update(sql,
                animal.getName(),
                animal.getDateOfBirth() != null ? Date.valueOf(animal.getDateOfBirth()) : null,
                animal.getAnimalType() != null ? animal.getAnimalType().ordinal() + 1 : 1,
                animal.getBreed(),
                animal.getGender() != null ? animal.getGender().ordinal() + 1 : 3,
                animal.getSize() != null ? animal.getSize().ordinal() + 1 : 2,
                animal.getTemperament(),
                animal.getStatus() != null ? animal.getStatus().ordinal() + 1 : 1,
                animal.getIntakeDate() != null ? Date.valueOf(animal.getIntakeDate()) : Date.valueOf(LocalDate.now()),
                animal.getDescription(),
                animal.getImageUrl(),
                animal.getPreviousOwnerId(),
                animal.getId()
        );
        
        return findById(animal.getId()).orElse(animal);
    }

    public void deleteById(UUID id) {
        jdbcTemplate.update("DELETE FROM animals WHERE id = ?", id);
    }

    public List<Animal> findByPreviousOwnerId(UUID previousOwnerId) {
        String sql = """
            SELECT a.id, a.name, a.date_of_birth, at.name as animal_type, a.breed,
                   a.gender_id, a.size_id, a.temperament, ast.name as status,
                   a.intake_date, a.description, a.image_url, a.previous_owner_id,
                   a.created_at, a.updated_at
            FROM animals a
            JOIN animal_type at ON a.animal_type_id = at.id
            JOIN animal_status ast ON a.status_id = ast.id
            WHERE a.previous_owner_id = ?
            ORDER BY a.created_at DESC
            """;
        return jdbcTemplate.query(sql, animalRowMapper, previousOwnerId);
    }

    public long countByStatus(AnimalStatus status) {
        String sql = "SELECT COUNT(*) FROM animals a JOIN animal_status ast ON a.status_id = ast.id WHERE ast.name = ?";
        Long count = jdbcTemplate.queryForObject(sql, Long.class, status.name());
        return count != null ? count : 0;
    }

    public long countByType(AnimalType type) {
        String sql = "SELECT COUNT(*) FROM animals a JOIN animal_type at ON a.animal_type_id = at.id WHERE at.name = ?";
        Long count = jdbcTemplate.queryForObject(sql, Long.class, type.name());
        return count != null ? count : 0;
    }

    public long countByIntakeDateBetween(LocalDate start, LocalDate end) {
        String sql = "SELECT COUNT(*) FROM animals WHERE intake_date BETWEEN ? AND ?";
        Long count = jdbcTemplate.queryForObject(sql, Long.class, Date.valueOf(start), Date.valueOf(end));
        return count != null ? count : 0;
    }

    public long countAll() {
        String sql = "SELECT COUNT(*) FROM animals";
        Long count = jdbcTemplate.queryForObject(sql, Long.class);
        return count != null ? count : 0;
    }
}
