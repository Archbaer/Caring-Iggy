package com.caringiggy.user.service;

import com.caringiggy.user.dto.CreateEmployeeRequest;
import com.caringiggy.user.dto.EmployeeDto;
import com.caringiggy.user.dto.UpdateEmployeeRequest;
import com.caringiggy.user.exception.ApiException;
import com.caringiggy.user.model.Employee;
import com.caringiggy.user.model.EmployeeRole;
import com.caringiggy.user.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;

    public List<EmployeeDto> getAllEmployees() {
        return employeeRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public EmployeeDto getEmployeeById(UUID id) {
        return employeeRepository.findById(id).map(this::toDto)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Employee not found with id: " + id));
    }

    public EmployeeDto getEmployeeByEmail(String email) {
        return employeeRepository.findByEmail(email).map(this::toDto)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Employee not found with email: " + email));
    }

    @Transactional
    public EmployeeDto createEmployee(CreateEmployeeRequest request) {
        Employee employee = Employee.builder()
                .name(request.getName())
                .email(request.getEmail())
                .telephone(request.getTelephone())
                .role(parseRole(request.getRole(), EmployeeRole.STAFF))
                .build();
        Employee saved = employeeRepository.save(employee);
        log.info("Created employee with id: {}", saved.getId());
        return toDto(saved);
    }

    @Transactional
    public EmployeeDto updateEmployee(UUID id, UpdateEmployeeRequest request) {
        Employee existing = employeeRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Employee not found with id: " + id));
        if (request.getName() != null) existing.setName(request.getName());
        if (request.getEmail() != null) existing.setEmail(request.getEmail());
        if (request.getTelephone() != null) existing.setTelephone(request.getTelephone());
        if (request.getRole() != null) existing.setRole(parseRole(request.getRole(), existing.getRole()));
        Employee updated = employeeRepository.save(existing);
        log.info("Updated employee with id: {}", id);
        return toDto(updated);
    }

    @Transactional
    public void deleteEmployee(UUID id) {
        if (employeeRepository.findById(id).isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Employee not found with id: " + id);
        }
        employeeRepository.deleteById(id);
        log.info("Deleted employee with id: {}", id);
    }

    private EmployeeRole parseRole(String value, EmployeeRole defaultRole) {
        if (value == null || value.isBlank()) {
            return defaultRole;
        }

        try {
            return EmployeeRole.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Employee role must be STAFF or ADMIN");
        }
    }

    private EmployeeDto toDto(Employee employee) {
        return EmployeeDto.builder()
                .id(employee.getId())
                .name(employee.getName())
                .email(employee.getEmail())
                .telephone(employee.getTelephone())
                .role(employee.getRole().name())
                .createdAt(employee.getCreatedAt())
                .updatedAt(employee.getUpdatedAt())
                .build();
    }
}
