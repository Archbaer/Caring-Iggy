package com.caringiggy.user.controller;

import com.caringiggy.user.dto.CreateEmployeeRequest;
import com.caringiggy.user.dto.EmployeeDto;
import com.caringiggy.user.dto.UpdateEmployeeRequest;
import com.caringiggy.user.service.AuthService;
import com.caringiggy.user.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {
    private final AuthService authService;
    private final EmployeeService employeeService;

    public EmployeeController(AuthService authService, EmployeeService employeeService) {
        this.authService = authService;
        this.employeeService = employeeService;
    }

    @GetMapping
    public ResponseEntity<List<EmployeeDto>> getAllEmployees(
            @CookieValue(name = AuthService.SESSION_COOKIE_NAME, required = false) String sessionToken) {
        authService.requireAdminSession(sessionToken);
        return ResponseEntity.ok(employeeService.getAllEmployees());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeDto> getEmployeeById(
            @PathVariable UUID id,
            @CookieValue(name = AuthService.SESSION_COOKIE_NAME, required = false) String sessionToken) {
        authService.requireAdminSession(sessionToken);
        return ResponseEntity.ok(employeeService.getEmployeeById(id));
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<EmployeeDto> getEmployeeByEmail(
            @PathVariable String email,
            @CookieValue(name = AuthService.SESSION_COOKIE_NAME, required = false) String sessionToken) {
        authService.requireAdminSession(sessionToken);
        return ResponseEntity.ok(employeeService.getEmployeeByEmail(email));
    }

    @PostMapping
    public ResponseEntity<EmployeeDto> createEmployee(
            @Valid @RequestBody CreateEmployeeRequest request,
            @CookieValue(name = AuthService.SESSION_COOKIE_NAME, required = false) String sessionToken) {
        authService.requireAdminSession(sessionToken);
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.createEmployee(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeDto> updateEmployee(
            @PathVariable UUID id,
            @RequestBody UpdateEmployeeRequest request,
            @CookieValue(name = AuthService.SESSION_COOKIE_NAME, required = false) String sessionToken) {
        authService.requireAdminSession(sessionToken);
        return ResponseEntity.ok(employeeService.updateEmployee(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(
            @PathVariable UUID id,
            @CookieValue(name = AuthService.SESSION_COOKIE_NAME, required = false) String sessionToken) {
        authService.requireAdminSession(sessionToken);
        employeeService.deleteEmployee(id);
        return ResponseEntity.noContent().build();
    }
}
