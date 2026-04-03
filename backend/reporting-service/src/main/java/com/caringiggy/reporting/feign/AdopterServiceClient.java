package com.caringiggy.reporting.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;
import java.util.Map;

@FeignClient(name = "adopter-service", url = "${ADOPTER_SERVICE_URL:http://adopter-service:8082}")
public interface AdopterServiceClient {

    @GetMapping("/api/adopters")
    List<Map<String, Object>> getAllAdopters();
}
