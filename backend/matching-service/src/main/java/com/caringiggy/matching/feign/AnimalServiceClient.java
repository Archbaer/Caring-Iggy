package com.caringiggy.matching.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@FeignClient(name = "animal-service", url = "${ANIMAL_SERVICE_URL:http://animal-service:8081}")
public interface AnimalServiceClient {

    @GetMapping("/api/animals")
    List<Map<String, Object>> getAllAnimals();

    @GetMapping("/api/animals/{id}")
    Map<String, Object> getAnimalById(@PathVariable("id") String id);

    @GetMapping("/api/animals")
    List<Map<String, Object>> getAnimalsByStatus(@RequestParam("status") String status);
}
