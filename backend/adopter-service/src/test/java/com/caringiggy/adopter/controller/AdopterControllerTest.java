package com.caringiggy.adopter.controller;

import com.caringiggy.adopter.dto.AdopterDto;
import com.caringiggy.adopter.dto.AdoptionHistoryDto;
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

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
    void updateAdopter_withInvalidEmail_returns400WithErrorBody() throws Exception {
        UUID adopterId = UUID.randomUUID();
        mockMvc.perform(put("/api/adopters/" + adopterId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").value("Invalid email format"));
    }

    @Test
    void updateAdopter_withInvalidStatus_returns400WithErrorBody() throws Exception {
        UUID adopterId = UUID.randomUUID();
        mockMvc.perform(put("/api/adopters/" + adopterId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"BANNED\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.status").value("status must be ACTIVE, PENDING_REVIEW, APPROVED, REJECTED, or INACTIVE"));
    }

    @Test
    void createAdoptionHistory_withFutureAdoptionDate_returns400WithErrorBody() throws Exception {
        String futureDate = LocalDate.now().plusYears(1).toString();
        mockMvc.perform(post("/api/adopters/history")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adopterId\":\"" + UUID.randomUUID() + "\"," +
                                 "\"animalId\":\"" + UUID.randomUUID() + "\"," +
                                 "\"adoptionDate\":\"" + futureDate + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.adoptionDate").value("adoptionDate must not be in the future"));
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

    @Test
    void createAdopter_withWhitespaceOnlyName_returns400WithErrorBody() throws Exception {
        mockMvc.perform(post("/api/adopters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"   \",\"telephone\":\"555-0100\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").value("Name is required"));
    }

    @Test
    void createAdopter_withMissingName_returns400WithErrorBody() throws Exception {
        mockMvc.perform(post("/api/adopters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"telephone\":\"555-0100\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").value("Name is required"));
    }

    @Test
    void createAdopter_withInvalidEmail_returns400WithErrorBody() throws Exception {
        mockMvc.perform(post("/api/adopters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ava\",\"telephone\":\"555-0100\",\"email\":\"bad-email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").value("Email must be valid"));
    }

    @Test
    void updateAdopter_notFound_returns404WithErrorBody() throws Exception {
        UUID adopterId = UUID.randomUUID();
        when(adopterService.updateAdopter(eq(adopterId), any(UpdateAdopterRequest.class)))
                .thenThrow(new NotFoundException("Adopter not found with id: " + adopterId));

        mockMvc.perform(put("/api/adopters/" + adopterId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New Name\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void deleteAdopter_notFound_returns404WithErrorBody() throws Exception {
        UUID adopterId = UUID.randomUUID();
        doThrow(new NotFoundException("Adopter not found with id: " + adopterId))
                .when(adopterService).deleteAdopter(adopterId);

        mockMvc.perform(delete("/api/adopters/" + adopterId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void createAdoptionHistory_withMissingAdopterId_returns400WithErrorBody() throws Exception {
        mockMvc.perform(post("/api/adopters/history")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"animalId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.adopterId").value("Adopter ID is required"));
    }

    @Test
    void createAdoptionHistory_withMissingAnimalId_returns400WithErrorBody() throws Exception {
        mockMvc.perform(post("/api/adopters/history")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adopterId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.animalId").value("Animal ID is required"));
    }

    // ─── GET /api/adopters/history?month= ────────────────────────────────────

    @Test
    void getAdoptionHistoryByMonth_withValidMonth_returns200WithList() throws Exception {
        AdoptionHistoryDto record = AdoptionHistoryDto.builder()
                .id(UUID.randomUUID())
                .adopterId(UUID.randomUUID())
                .animalId(UUID.randomUUID())
                .adoptionDate(LocalDate.of(2026, 1, 15))
                .build();

        when(adopterService.getAdoptionHistoryByMonth("2026-01")).thenReturn(List.of(record));

        mockMvc.perform(get("/api/adopters/history").param("month", "2026-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].adoptionDate").value("2026-01-15"));
    }

    @Test
    void getAdoptionHistoryByMonth_withNoRecordsInMonth_returns200WithEmptyList() throws Exception {
        when(adopterService.getAdoptionHistoryByMonth("2026-01")).thenReturn(List.of());

        mockMvc.perform(get("/api/adopters/history").param("month", "2026-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getAdoptionHistoryByMonth_withMissingMonthParam_returns400() throws Exception {
        mockMvc.perform(get("/api/adopters/history"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getAdoptionHistoryByMonth_withInvalidMonthFormat_returns400() throws Exception {
        mockMvc.perform(get("/api/adopters/history").param("month", "January-2026"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getAdoptionHistoryByMonth_withPartialDate_returns400() throws Exception {
        mockMvc.perform(get("/api/adopters/history").param("month", "2026"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateInterests_withFourAnimals_returns400WithErrorBody() throws Exception {
        UUID adopterId = UUID.randomUUID();
        String fourUuids = "\"" + UUID.randomUUID() + "\",\"" + UUID.randomUUID() + "\"," +
                           "\"" + UUID.randomUUID() + "\",\"" + UUID.randomUUID() + "\"";
        mockMvc.perform(put("/api/adopters/" + adopterId + "/interests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"interestedAnimals\":[" + fourUuids + "]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.interestedAnimals").value("Maximum 3 animals allowed"));
    }
}
