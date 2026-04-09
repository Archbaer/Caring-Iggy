package com.caringiggy.matching.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@FeignClient(name = "adopter-service", url = "${ADOPTER_SERVICE_URL:http://adopter-service:8082}")
public interface AdopterServiceClient {

    @GetMapping("/api/adopters")
    List<Map<String, Object>> getAllAdopters();

    @GetMapping("/api/adopters/{id}")
    Map<String, Object> getAdopterById(@PathVariable("id") String id);

    @GetMapping("/api/adopters/restricted")
    List<Map<String, Object>> getAllAdoptersRestricted();

    @GetMapping("/api/adopters/search")
    Map<String, Object> getAdopterProfileByNameAndTelephone(@RequestParam("name") String name, @RequestParam("telephone") String telephone);
}
