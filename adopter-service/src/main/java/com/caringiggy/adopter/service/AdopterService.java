package com.caringiggy.adopter.service;

import com.caringiggy.adopter.dto.*;
import com.caringiggy.adopter.model.Adopter;
import com.caringiggy.adopter.model.AdopterStatus;
import com.caringiggy.adopter.model.AdoptionHistory;
import com.caringiggy.adopter.repository.AdopterRepository;
import com.caringiggy.adopter.repository.AdoptionHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdopterService {

    private final AdopterRepository adopterRepository;
    private final AdoptionHistoryRepository adoptionHistoryRepository;

    public List<AdopterDto> getAllAdopters() {
        return adopterRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public AdopterDto getAdopterById(UUID id) {
        Adopter adopter = adopterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Adopter not found with id: " + id));
        return toDto(adopter);
    }

    public List<AdopterDto> getAdoptersByStatus(String status) {
        AdopterStatus adopterStatus = AdopterStatus.valueOf(status.toUpperCase());
        return adopterRepository.findByStatus(adopterStatus).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public AdopterRestrictedDto getAdopterRestricted(UUID id) {
        Adopter adopter = adopterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Adopter not found with id: " + id));
        
        UUID firstInterestedAnimal = adopter.getInterestedAnimals() != null && !adopter.getInterestedAnimals().isEmpty()
                ? adopter.getInterestedAnimals().get(0)
                : null;
        
        return AdopterRestrictedDto.builder()
                .id(adopter.getId())
                .name(adopter.getName())
                .telephone(adopter.getTelephone())
                .interestedAnimalId(firstInterestedAnimal)
                .build();
    }

    public List<AdopterRestrictedDto> getAllAdoptersRestricted() {
        return adopterRepository.findAll().stream()
                .map(adopter -> {
                    UUID firstInterestedAnimal = adopter.getInterestedAnimals() != null && !adopter.getInterestedAnimals().isEmpty()
                            ? adopter.getInterestedAnimals().get(0)
                            : null;
                    
                    return AdopterRestrictedDto.builder()
                            .id(adopter.getId())
                            .name(adopter.getName())
                            .telephone(adopter.getTelephone())
                            .interestedAnimalId(firstInterestedAnimal)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public AdopterDto createAdopter(CreateAdopterRequest request) {
        Adopter adopter = Adopter.builder()
                .name(request.getName())
                .telephone(request.getTelephone())
                .email(request.getEmail())
                .address(request.getAddress())
                .status(request.getStatus() != null ? AdopterStatus.valueOf(request.getStatus().toUpperCase()) : AdopterStatus.ACTIVE)
                .preferences(request.getPreferences())
                .interestedAnimals(request.getInterestedAnimals() != null
                        ? request.getInterestedAnimals().stream().map(UUID::fromString).collect(Collectors.toList())
                        : List.of())
                .build();

        Adopter savedAdopter = adopterRepository.save(adopter);
        log.info("Created adopter with id: {}", savedAdopter.getId());
        return toDto(savedAdopter);
    }

    @Transactional
    public AdopterDto updateAdopter(UUID id, UpdateAdopterRequest request) {
        Adopter existingAdopter = adopterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Adopter not found with id: " + id));

        if (request.getName() != null) {
            existingAdopter.setName(request.getName());
        }
        if (request.getTelephone() != null) {
            existingAdopter.setTelephone(request.getTelephone());
        }
        if (request.getEmail() != null) {
            existingAdopter.setEmail(request.getEmail());
        }
        if (request.getAddress() != null) {
            existingAdopter.setAddress(request.getAddress());
        }
        if (request.getStatus() != null) {
            existingAdopter.setStatus(AdopterStatus.valueOf(request.getStatus().toUpperCase()));
        }
        if (request.getPreferences() != null) {
            existingAdopter.setPreferences(request.getPreferences());
        }

        Adopter updatedAdopter = adopterRepository.save(existingAdopter);
        log.info("Updated adopter with id: {}", id);
        return toDto(updatedAdopter);
    }

    @Transactional
    public AdopterDto updateInterests(UUID id, UpdateInterestsRequest request) {
        Adopter existingAdopter = adopterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Adopter not found with id: " + id));

        if (request.getInterestedAnimals() != null) {
            if (request.getInterestedAnimals().size() > 3) {
                throw new IllegalArgumentException("Maximum 3 animals allowed");
            }
            existingAdopter.setInterestedAnimals(request.getInterestedAnimals());
        }

        Adopter updatedAdopter = adopterRepository.save(existingAdopter);
        log.info("Updated interests for adopter with id: {}", id);
        return toDto(updatedAdopter);
    }

    @Transactional
    public void deleteAdopter(UUID id) {
        if (adopterRepository.findById(id).isEmpty()) {
            throw new RuntimeException("Adopter not found with id: " + id);
        }
        adopterRepository.deleteById(id);
        log.info("Deleted adopter with id: {}", id);
    }

    public List<AdoptionHistoryDto> getAdoptionHistoryByAdopter(UUID adopterId) {
        if (adopterRepository.findById(adopterId).isEmpty()) {
            throw new RuntimeException("Adopter not found with id: " + adopterId);
        }
        
        return adoptionHistoryRepository.findByAdopterId(adopterId).stream()
                .map(this::toHistoryDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AdoptionHistoryDto createAdoptionHistory(CreateAdoptionHistoryRequest request) {
        if (adopterRepository.findById(request.getAdopterId()).isEmpty()) {
            throw new RuntimeException("Adopter not found with id: " + request.getAdopterId());
        }

        AdoptionHistory history = AdoptionHistory.builder()
                .adopterId(request.getAdopterId())
                .animalId(request.getAnimalId())
                .adoptionDate(request.getAdoptionDate() != null ? request.getAdoptionDate() : LocalDate.now())
                .notes(request.getNotes())
                .build();

        AdoptionHistory savedHistory = adoptionHistoryRepository.save(history);
        log.info("Created adoption history with id: {}", savedHistory.getId());
        return toHistoryDto(savedHistory);
    }

    private AdopterDto toDto(Adopter adopter) {
        return AdopterDto.builder()
                .id(adopter.getId())
                .name(adopter.getName())
                .telephone(adopter.getTelephone())
                .email(adopter.getEmail())
                .address(adopter.getAddress())
                .status(adopter.getStatus() != null ? adopter.getStatus().name() : null)
                .preferences(adopter.getPreferences())
                .interestedAnimals(adopter.getInterestedAnimals())
                .createdAt(adopter.getCreatedAt())
                .updatedAt(adopter.getUpdatedAt())
                .build();
    }

    private AdoptionHistoryDto toHistoryDto(AdoptionHistory history) {
        return AdoptionHistoryDto.builder()
                .id(history.getId())
                .adopterId(history.getAdopterId())
                .animalId(history.getAnimalId())
                .adoptionDate(history.getAdoptionDate())
                .notes(history.getNotes())
                .build();
    }
}
