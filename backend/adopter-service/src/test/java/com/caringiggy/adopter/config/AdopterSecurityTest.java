package com.caringiggy.adopter.config;

import com.caringiggy.adopter.controller.AdopterController;
import com.caringiggy.adopter.service.AdopterService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdopterController.class)
@Import(SecurityConfig.class)
class AdopterSecurityTest {

    @Autowired MockMvc mvc;
    @MockBean AdopterService adopterService;

    @Test
    void noTokenRejectedOnStaffListing() throws Exception {
        mvc.perform(get("/api/adopters")).andExpect(status().isUnauthorized());
    }

    @Test
    void adopterRoleForbiddenOnStaffListing() throws Exception {
        mvc.perform(get("/api/adopters")
                        .with(jwt().jwt(j -> j.claim("role", "ADOPTER")).authorities(() -> "ROLE_ADOPTER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffRolePassesOnStaffListing() throws Exception {
        when(adopterService.getAllAdopters()).thenReturn(List.of());
        mvc.perform(get("/api/adopters")
                        .with(jwt().jwt(j -> j.claim("role", "STAFF")).authorities(() -> "ROLE_STAFF")))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    void adopterRolePassesOnSelfServiceSearch() throws Exception {
        mvc.perform(get("/api/adopters/search").param("name", "a").param("telephone", "1")
                        .with(jwt().jwt(j -> j.claim("role", "ADOPTER")).authorities(() -> "ROLE_ADOPTER")))
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    if (s == 401 || s == 403) {
                        throw new AssertionError("expected non-auth status, got " + s);
                    }
                });
    }
}
