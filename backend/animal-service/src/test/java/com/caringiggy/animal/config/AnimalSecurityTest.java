package com.caringiggy.animal.config;

import com.caringiggy.animal.controller.AnimalController;
import com.caringiggy.animal.service.AnimalService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnimalController.class)
@Import(SecurityConfig.class)
class AnimalSecurityTest {

    @Autowired MockMvc mvc;
    @MockBean AnimalService animalService;

    @Test
    void publicCanListAnimals() throws Exception {
        // controller's no-query-param branch calls the no-arg overload
        when(animalService.getAllAnimals()).thenReturn(List.of());
        mvc.perform(get("/api/animals")).andExpect(status().isOk()); // A1: public read
    }

    @Test
    void createRequiresJwt() throws Exception {
        mvc.perform(post("/api/animals").contentType(MediaType.APPLICATION_JSON).content("{}"))
           .andExpect(status().isUnauthorized()); // no token
    }

    @Test
    void adopterCannotCreate() throws Exception {
        mvc.perform(post("/api/animals")
                .with(jwt().jwt(j -> j.claim("role", "ADOPTER")).authorities(() -> "ROLE_ADOPTER"))
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
           .andExpect(status().isForbidden());
    }

    @Test
    void staffCanCreate() throws Exception {
        mvc.perform(post("/api/animals")
                .with(jwt().jwt(j -> j.claim("role", "STAFF")).authorities(() -> "ROLE_STAFF"))
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
           .andExpect(status().isBadRequest()); // passes security, fails validation (empty body) => not 401/403
    }
}
