package com.caringiggy.user.service;

import com.caringiggy.user.dto.CreateEmployeeRequest;
import com.caringiggy.user.dto.EmployeeDto;
import com.caringiggy.user.dto.UpdateEmployeeRequest;
import com.caringiggy.user.model.Employee;
import com.caringiggy.user.model.EmployeeRole;
import com.caringiggy.user.repository.EmployeeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private EmployeeService employeeService;

    @Test
    void createEmployee_usesDefaultRoleWhenRoleMissing() {
        CreateEmployeeRequest request = CreateEmployeeRequest.builder()
                .name("Alice")
                .email("alice@example.com")
                .telephone("123456")
                .build();

        UUID id = UUID.randomUUID();
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> {
            Employee employee = invocation.getArgument(0);
            employee.setId(id);
            return employee;
        });

        EmployeeDto created = employeeService.createEmployee(request);

        assertThat(created.getId()).isEqualTo(id);
        assertThat(created.getRole()).isEqualTo(EmployeeRole.STAFF.name());
        assertThat(created.getEmail()).isEqualTo("alice@example.com");
        verify(employeeRepository).save(any(Employee.class));
    }

    @Test
    void getEmployeeById_throwsWhenMissing() {
        UUID id = UUID.randomUUID();
        when(employeeRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> employeeService.getEmployeeById(id))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Employee not found with id");
    }

    @Test
    void updateEmployee_updatesProvidedFieldsOnly() {
        UUID id = UUID.randomUUID();
        Employee existing = Employee.builder()
                .id(id)
                .name("Old Name")
                .email("old@example.com")
                .telephone("111111")
                .role(EmployeeRole.STAFF)
                .build();

        UpdateEmployeeRequest request = UpdateEmployeeRequest.builder()
                .name("New Name")
                .role("admin")
                .build();

        when(employeeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmployeeDto updated = employeeService.updateEmployee(id, request);

        assertThat(updated.getName()).isEqualTo("New Name");
        assertThat(updated.getEmail()).isEqualTo("old@example.com");
        assertThat(updated.getTelephone()).isEqualTo("111111");
        assertThat(updated.getRole()).isEqualTo(EmployeeRole.ADMIN.name());
    }

    @Test
    void getAllEmployees_mapsEntitiesToDtos() {
        Employee employee = Employee.builder()
                .id(UUID.randomUUID())
                .name("Bob")
                .email("bob@example.com")
                .telephone("999999")
                .role(EmployeeRole.STAFF)
                .build();
        when(employeeRepository.findAll()).thenReturn(List.of(employee));

        List<EmployeeDto> result = employeeService.getAllEmployees();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Bob");
        assertThat(result.get(0).getRole()).isEqualTo(EmployeeRole.STAFF.name());
    }
}
