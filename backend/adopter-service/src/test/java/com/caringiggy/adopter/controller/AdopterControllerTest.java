package com.caringiggy.adopter.controller;

import com.caringiggy.adopter.dto.AdopterDto;
import com.caringiggy.adopter.dto.CreateAdopterRequest;
import com.caringiggy.adopter.dto.UpdateAdopterRequest;
import com.caringiggy.adopter.exception.NotFoundException;
import com.caringiggy.adopter.service.AdopterService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdopterController.class)
class AdopterControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AdopterService adopterService;

    @Test
    void createAdopter_returnsCreated() throws Exception {
        UUID adopterId = UUID.randomUUID();
        AdopterDto response = AdopterDto.builder()
                .id(adopterId)
                .name("Ava Adopter")
                .telephone("555-0100")
                .email("ava@example.com")
                .status("ACTIVE")
                .build();

        when(adopterService.createAdopter(any(CreateAdopterRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/adopters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CreateAdopterRequest.builder()
                                .name("Ava Adopter")
                                .telephone("555-0100")
                                .email("ava@example.com")
                                .build())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(adopterId.toString()))
                .andExpect(jsonPath("$.name").value("Ava Adopter"));
    }

    @Test
    void createAdopter_withMissingName_returns400() throws Exception {
        mockMvc.perform(post("/api/adopters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"telephone\":\"555-0100\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createAdopter_withMissingTelephone_returns400() throws Exception {
        mockMvc.perform(post("/api/adopters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ava\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createAdopter_withInvalidEmail_returns400() throws Exception {
        mockMvc.perform(post("/api/adopters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ava\",\"telephone\":\"555-0100\",\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateAdopter_withValidFields_returns200() throws Exception {
        UUID adopterId = UUID.randomUUID();
        AdopterDto response = AdopterDto.builder()
                .id(adopterId)
                .name("Updated Name")
                .build();

        when(adopterService.updateAdopter(eq(adopterId), any(UpdateAdopterRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/adopters/" + adopterId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Updated Name\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Name"));
    }

    @Test
    void getAdopterById_notFound_returns404() throws Exception {
        UUID adopterId = UUID.randomUUID();
        when(adopterService.getAdopterById(adopterId))
                .thenThrow(new NotFoundException("Adopter not found with id: " + adopterId));

        mockMvc.perform(get("/api/adopters/" + adopterId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }
}
