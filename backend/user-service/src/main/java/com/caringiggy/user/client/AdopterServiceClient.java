package com.caringiggy.user.client;

import com.caringiggy.user.dto.AdopterProfileDto;
import com.caringiggy.user.dto.CreateAdopterProfileRequest;
import com.caringiggy.user.exception.ApiException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AdopterServiceClient {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Value("${services.adopter.url}")
    private String adopterServiceUrl;

    public AdopterProfileDto createAdopterProfile(CreateAdopterProfileRequest request) {
        try {
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(adopterServiceUrl + "/api/adopters"))
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(request)))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Failed to create adopter profile");
            }

            return objectMapper.readValue(response.body(), AdopterProfileDto.class);
        } catch (JsonProcessingException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize adopter profile request");
        } catch (IOException | InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Failed to reach adopter service");
        }
    }

    public void deleteAdopterProfile(UUID adopterId) {
        try {
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(adopterServiceUrl + "/api/adopters/" + adopterId))
                    .DELETE()
                    .build();
            httpClient.send(httpRequest, HttpResponse.BodyHandlers.discarding());
        } catch (IOException | InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
