package com.caringiggy.user.controller;

import com.caringiggy.user.dto.CreateEmployeeRequest;
import com.caringiggy.user.dto.EmployeeDto;
import com.caringiggy.user.service.EmployeeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
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
    private EmployeeService employeeService;

    @Test
    void getAllEmployees_returnsList() throws Exception {
        EmployeeDto employee = EmployeeDto.builder()
                .id(UUID.randomUUID())
                .name("Alice")
                .email("alice@example.com")
                .telephone("123456")
                .role("STAFF")
                .build();
        when(employeeService.getAllEmployees()).thenReturn(List.of(employee));

        mockMvc.perform(get("/api/employees"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Alice"))
                .andExpect(jsonPath("$[0].email").value("alice@example.com"));
    }

    @Test
    void createEmployee_withValidPayload_returnsCreated() throws Exception {
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
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }
}
