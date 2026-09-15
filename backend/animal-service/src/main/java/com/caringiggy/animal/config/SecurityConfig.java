package com.caringiggy.animal.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                // A1: public animal reads
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/animals", "/api/animals/**").permitAll()
                // writes: role check at filter level too, so wrong-role is rejected (403)
                // before @Valid request-body validation runs (which would otherwise fire first)
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/animals").hasAnyRole("STAFF", "ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/animals/**").hasAnyRole("STAFF", "ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/animals/**").hasAnyRole("STAFF", "ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(converter())));
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwkSetUri) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        decoder.setJwtValidator(JwtValidation.validator());
        return decoder;
    }

    private JwtAuthenticationConverter converter() {
        JwtGrantedAuthoritiesConverter roles = new JwtGrantedAuthoritiesConverter();
        // maps the "role" claim (e.g. "STAFF") to authority "ROLE_STAFF"
        roles.setAuthoritiesClaimName("role");
        roles.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter conv = new JwtAuthenticationConverter();
        conv.setJwtGrantedAuthoritiesConverter(jwt -> {
            String role = jwt.getClaimAsString("role");
            return role == null ? List.of() : List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role));
        });
        return conv;
    }
}
