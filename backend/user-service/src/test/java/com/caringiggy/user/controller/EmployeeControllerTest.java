package com.caringiggy.user.controller;

import com.caringiggy.user.dto.CreateEmployeeRequest;
import com.caringiggy.user.dto.EmployeeDto;
import com.caringiggy.user.exception.ApiException;
import com.caringiggy.user.service.AuthService;
import com.caringiggy.user.service.EmployeeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EmployeeController.class)
class EmployeeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private EmployeeService employeeService;

    @Test
    void getAllEmployees_withoutSession_returnsUnauthorized() throws Exception {
        doThrow(new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required"))
                .when(authService).requireAdminSession(isNull());

        mockMvc.perform(get("/api/employees"))
                .andExpect(status().isUnauthorized());

        verify(employeeService, never()).getAllEmployees();
    }

    @Test
    void getAllEmployees_withStaffSession_returnsForbidden() throws Exception {
        doThrow(new ApiException(HttpStatus.FORBIDDEN, "Only admins can access employee management"))
                .when(authService).requireAdminSession("staff-session");

        mockMvc.perform(get("/api/employees")
                        .cookie(new Cookie(AuthService.SESSION_COOKIE_NAME, "staff-session")))
                .andExpect(status().isForbidden());

        verify(employeeService, never()).getAllEmployees();
    }

    @Test
    void getAllEmployees_withAdminSession_returnsList() throws Exception {
        EmployeeDto employee = EmployeeDto.builder()
                .id(UUID.randomUUID())
                .name("Alice")
                .email("alice@example.com")
                .telephone("123456")
                .role("STAFF")
                .build();
        when(employeeService.getAllEmployees()).thenReturn(List.of(employee));

        mockMvc.perform(get("/api/employees")
                        .cookie(new Cookie(AuthService.SESSION_COOKIE_NAME, "admin-session")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Alice"))
                .andExpect(jsonPath("$[0].email").value("alice@example.com"));
    }

    @Test
    void createEmployee_withAdopterSession_returnsForbidden() throws Exception {
        doThrow(new ApiException(HttpStatus.FORBIDDEN, "Only admins can access employee management"))
                .when(authService).requireAdminSession("adopter-session");

        String payload = """
                {
                  "name": "Alice",
                  "email": "alice@example.com",
                  "telephone": "123456",
                  "role": "staff"
                }
                """;

        mockMvc.perform(post("/api/employees")
                        .cookie(new Cookie(AuthService.SESSION_COOKIE_NAME, "adopter-session"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());

        verify(employeeService, never()).createEmployee(any(CreateEmployeeRequest.class));
    }

    @Test
    void createEmployee_withAdminSessionAndValidPayload_returnsCreated() throws Exception {
        EmployeeDto created = EmployeeDto.builder()
                .id(UUID.randomUUID())
                .name("Alice")
                .email("alice@example.com")
                .telephone("123456")
                .role("STAFF")
                .build();
        when(employeeService.createEmployee(any(CreateEmployeeRequest.class))).thenReturn(created);

        String payload = """
                {
                  "name": "Alice",
                  "email": "alice@example.com",
                  "telephone": "123456",
                  "role": "staff"
                }
                """;

        mockMvc.perform(post("/api/employees")
                        .cookie(new Cookie(AuthService.SESSION_COOKIE_NAME, "admin-session"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Alice"))
                .andExpect(jsonPath("$.role").value("STAFF"));
    }

    @Test
    void createEmployee_withInvalidEmail_returnsBadRequest() throws Exception {
        String payload = """
                {
                  "name": "Alice",
                  "email": "not-an-email"
                }
                """;

        mockMvc.perform(post("/api/employees")
                        .cookie(new Cookie(AuthService.SESSION_COOKIE_NAME, "admin-session"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createEmployee_withMissingName_returnsBadRequest() throws Exception {
        CreateEmployeeRequest invalid = CreateEmployeeRequest.builder()
                .email("alice@example.com")
                .telephone("123456")
                .build();

        mockMvc.perform(post("/api/employees")
                        .cookie(new Cookie(AuthService.SESSION_COOKIE_NAME, "admin-session"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }
}
