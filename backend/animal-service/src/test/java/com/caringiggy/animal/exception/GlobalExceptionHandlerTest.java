package com.caringiggy.animal.exception;

import com.caringiggy.animal.config.SecurityConfig;
import com.caringiggy.animal.controller.AnimalController;
import com.caringiggy.animal.service.AnimalService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Proves AccessDeniedException (what @PreAuthorize throws on denial) is mapped to 403 by
// GlobalExceptionHandler, not swallowed by the generic RuntimeException -> 500 handler.
// Uses the public GET route (no filter-level role matcher) so the exception reaches the
// controller advice directly, isolating this from A1's filter-level role rejection.
@WebMvcTest(AnimalController.class)
@Import(SecurityConfig.class)
class GlobalExceptionHandlerTest {

    @Autowired MockMvc mvc;
    @MockBean AnimalService animalService;

    @Test
    void accessDeniedExceptionMapsTo403() throws Exception {
        UUID id = UUID.randomUUID();
        when(animalService.getAnimalById(id)).thenThrow(new AccessDeniedException("denied"));

        mvc.perform(get("/api/animals/" + id))
           .andExpect(status().isForbidden())
           .andExpect(jsonPath("$.status").value(403))
           .andExpect(jsonPath("$.message").value("Access denied"));
    }
}
