package com.caringiggy.animal.controller;

import com.caringiggy.animal.dto.AnimalDetailDto;
import com.caringiggy.animal.dto.CreateAnimalRequest;
import com.caringiggy.animal.dto.PreviousOwnerDto;
import com.caringiggy.animal.dto.PreviousOwnerRequest;
import com.caringiggy.animal.dto.UpdateAnimalRequest;
import com.caringiggy.animal.exception.NotFoundException;
import com.caringiggy.animal.model.AnimalGender;
import com.caringiggy.animal.model.AnimalSize;
import com.caringiggy.animal.model.AnimalStatus;
import com.caringiggy.animal.model.AnimalType;
import com.caringiggy.animal.service.AnimalService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnimalController.class)
class AnimalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AnimalService animalService;

    @Test
    void createAnimal_returnsCreatedAnimalPayload() throws Exception {
        UUID animalId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();

        AnimalDetailDto response = AnimalDetailDto.builder()
                .id(animalId)
                .name("Mochi")
                .dateOfBirth(LocalDate.of(2022, 4, 1))
                .animalType(AnimalType.DOG)
                .breed("Shiba Inu")
                .gender(AnimalGender.FEMALE)
                .size(AnimalSize.MEDIUM)
                .temperament("Friendly")
                .status(AnimalStatus.AVAILABLE)
                .intakeDate(LocalDate.of(2024, 2, 1))
                .description("Playful")
                .imageUrl("https://example.com/mochi.jpg")
                .previousOwner(PreviousOwnerDto.builder()
                        .id(ownerId)
                        .name("Taylor")
                        .telephone("555-0100")
                        .email("taylor@example.com")
                        .address("123 Rescue Rd")
                        .build())
                .createdAt(LocalDateTime.of(2024, 2, 1, 10, 15))
                .updatedAt(LocalDateTime.of(2024, 2, 1, 10, 15))
                .build();

        when(animalService.createAnimal(any(CreateAnimalRequest.class))).thenReturn(response);

        CreateAnimalRequest request = CreateAnimalRequest.builder()
                .name("Mochi")
                .dateOfBirth(LocalDate.of(2022, 4, 1))
                .animalType("DOG")
                .breed("Shiba Inu")
                .gender("FEMALE")
                .size("MEDIUM")
                .temperament("Friendly")
                .status("AVAILABLE")
                .intakeDate(LocalDate.of(2024, 2, 1))
                .description("Playful")
                .imageUrl("https://example.com/mochi.jpg")
                .previousOwner(PreviousOwnerRequest.builder()
                        .name("Taylor")
                        .telephone("555-0100")
                        .email("taylor@example.com")
                        .address("123 Rescue Rd")
                        .build())
                .build();

        mockMvc.perform(post("/api/animals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(animalId.toString()))
                .andExpect(jsonPath("$.name").value("Mochi"))
                .andExpect(jsonPath("$.animalType").value("DOG"))
                .andExpect(jsonPath("$.previousOwner.id").value(ownerId.toString()))
                .andExpect(jsonPath("$.previousOwner.name").value("Taylor"));
    }

    @Test
    void createAnimal_withMissingName_returns400() throws Exception {
        mockMvc.perform(post("/api/animals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"breed\":\"Poodle\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateAnimal_withValidFields_returns200() throws Exception {
        UUID animalId = UUID.randomUUID();
        AnimalDetailDto response = AnimalDetailDto.builder()
                .id(animalId)
                .name("Updated")
                .status(AnimalStatus.PENDING)
                .build();

        when(animalService.updateAnimal(eq(animalId), any(UpdateAnimalRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/animals/" + animalId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PENDING\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void updateAnimal_withInvalidStatus_returns400() throws Exception {
        UUID animalId = UUID.randomUUID();

        mockMvc.perform(put("/api/animals/" + animalId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INVALID_STATUS\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateAnimal_withInvalidGender_returns400() throws Exception {
        UUID animalId = UUID.randomUUID();

        mockMvc.perform(put("/api/animals/" + animalId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gender\":\"NEUTRAL\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getAnimalById_notFound_returns404() throws Exception {
        UUID animalId = UUID.randomUUID();
        when(animalService.getAnimalById(animalId)).thenThrow(new NotFoundException("Animal not found with id: " + animalId));

        mockMvc.perform(get("/api/animals/" + animalId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void deleteAnimal_notFound_returns404() throws Exception {
        UUID animalId = UUID.randomUUID();
        doThrow(new NotFoundException("Animal not found with id: " + animalId))
                .when(animalService).deleteAnimal(animalId);

        mockMvc.perform(delete("/api/animals/" + animalId))
                .andExpect(status().isNotFound());
    }

    @Test
    void createAnimal_unexpectedError_returns500() throws Exception {
        when(animalService.createAnimal(any(CreateAnimalRequest.class)))
                .thenThrow(new RuntimeException("Database connection lost"));

        mockMvc.perform(post("/api/animals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\"}"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void createAnimal_withInvalidAnimalType_returns400WithErrorBody() throws Exception {
        mockMvc.perform(post("/api/animals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mochi\",\"animalType\":\"DRAGON\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.animalType").value("animalType must be DOG, CAT, or BIRD"));
    }

    @Test
    void createAnimal_withInvalidGender_returns400WithErrorBody() throws Exception {
        mockMvc.perform(post("/api/animals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mochi\",\"gender\":\"NEUTRAL\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.gender").value("gender must be MALE, FEMALE, or UNKNOWN"));
    }

    @Test
    void createAnimal_withInvalidSize_returns400WithErrorBody() throws Exception {
        mockMvc.perform(post("/api/animals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mochi\",\"size\":\"ENORMOUS\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.size").value("size must be SMALL, MEDIUM, or LARGE"));
    }

    @Test
    void createAnimal_withInvalidStatus_returns400WithErrorBody() throws Exception {
        mockMvc.perform(post("/api/animals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mochi\",\"status\":\"LOST\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.status").value("status must be AVAILABLE, PENDING, ADOPTED, IN_TREATMENT, or DECEASED"));
    }

    @Test
    void createAnimal_withFutureDateOfBirth_returns400WithErrorBody() throws Exception {
        String futureDate = LocalDate.now().plusYears(1).toString();
        mockMvc.perform(post("/api/animals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mochi\",\"dateOfBirth\":\"" + futureDate + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateOfBirth").value("dateOfBirth must not be in the future"));
    }

    @Test
    void createAnimal_withFutureIntakeDate_returns400WithErrorBody() throws Exception {
        String futureDate = LocalDate.now().plusYears(1).toString();
        mockMvc.perform(post("/api/animals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mochi\",\"intakeDate\":\"" + futureDate + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.intakeDate").value("intakeDate must not be in the future"));
    }

    @Test
    void createAnimal_withPreviousOwnerMissingName_returns400WithNestedErrorBody() throws Exception {
        mockMvc.perform(post("/api/animals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mochi\",\"previousOwner\":{\"telephone\":\"555-0100\"}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors['previousOwner.name']").value("Name is required"));
    }
}
