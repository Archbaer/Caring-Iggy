package com.caringiggy.matching.config;

import com.caringiggy.matching.controller.MatchingController;
import com.caringiggy.matching.service.MatchingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MatchingController.class)
@Import(SecurityConfig.class)
class MatchingSecurityTest {

    @Autowired MockMvc mvc;
    @MockBean MatchingService matchingService;

    @Test
    void noTokenReturns401() throws Exception {
        mvc.perform(post("/api/matching/adopter").param("name", "a").param("telephone", "1"))
           .andExpect(status().isUnauthorized());
    }

    @Test
    void anyRoleJwtPassesSecurity() throws Exception {
        mvc.perform(post("/api/matching/adopter")
                .param("name", "a").param("telephone", "1")
                .with(jwt().jwt(j -> j.claim("role", "ADOPTER")).authorities(() -> "ROLE_ADOPTER")))
           .andExpect(status().isOk());
    }
}
