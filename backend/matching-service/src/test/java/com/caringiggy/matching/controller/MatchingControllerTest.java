package com.caringiggy.matching.controller;

import com.caringiggy.matching.dto.MatchingResponse;
import com.caringiggy.matching.service.MatchingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MatchingController.class)
class MatchingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MatchingService matchingService;

    @Test
    void findMatches_withValidParams_returns200() throws Exception {
        MatchingResponse response = MatchingResponse.builder()
                .adopterName("Ava Adopter")
                .adopterTelephone("555-0100")
                .preferences(Collections.emptyMap())
                .matchedAnimals(Collections.emptyList())
                .matchCount(0)
                .build();

        when(matchingService.findMatches("Ava Adopter", "555-0100")).thenReturn(response);

        mockMvc.perform(post("/api/matching/adopter")
                        .param("name", "Ava Adopter")
                        .param("telephone", "555-0100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.adopterName").value("Ava Adopter"))
                .andExpect(jsonPath("$.matchCount").value(0));
    }

    @Test
    void findMatches_withBlankName_returns400() throws Exception {
        mockMvc.perform(post("/api/matching/adopter")
                        .param("name", "")
                        .param("telephone", "555-0100"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void findMatches_withBlankTelephone_returns400() throws Exception {
        mockMvc.perform(post("/api/matching/adopter")
                        .param("name", "Ava Adopter")
                        .param("telephone", ""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void findMatches_withMissingName_returns400() throws Exception {
        mockMvc.perform(post("/api/matching/adopter")
                        .param("telephone", "555-0100"))
                .andExpect(status().isBadRequest());
    }
}
