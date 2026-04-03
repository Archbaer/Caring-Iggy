package com.caringiggy.animal.service;

import com.caringiggy.animal.dto.*;
import com.caringiggy.animal.model.Animal;
import com.caringiggy.animal.model.AnimalGender;
import com.caringiggy.animal.model.AnimalSize;
import com.caringiggy.animal.model.AnimalStatus;
import com.caringiggy.animal.model.AnimalType;
import com.caringiggy.animal.model.PreviousOwner;
import com.caringiggy.animal.repository.AnimalRepository;
import com.caringiggy.animal.repository.PreviousOwnerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnimalService {

    private final AnimalRepository animalRepository;
    private final PreviousOwnerRepository previousOwnerRepository;

    public List<AnimalSummaryDto> getAllAnimals() {
        return animalRepository.findAll().stream()
                .map(this::toSummaryDto)
                .collect(Collectors.toList());
    }

    public AnimalDetailDto getAnimalById(UUID id) {
        Animal animal = animalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Animal not found with id: " + id));
        return toDetailDto(animal);
    }

    public List<AnimalSummaryDto> getAnimalsByStatus(String status) {
        AnimalStatus animalStatus = AnimalStatus.valueOf(status.toUpperCase());
        return animalRepository.findByStatus(animalStatus).stream()
                .map(this::toSummaryDto)
                .collect(Collectors.toList());
    }

    public List<AnimalSummaryDto> getAnimalsByType(String type) {
        AnimalType animalType = AnimalType.valueOf(type.toUpperCase());
        return animalRepository.findByType(animalType).stream()
                .map(this::toSummaryDto)
                .collect(Collectors.toList());
    }

    public List<AnimalSummaryDto> getAnimalsByStatusAndType(String status, String type) {
        AnimalStatus animalStatus = AnimalStatus.valueOf(status.toUpperCase());
        AnimalType animalType = AnimalType.valueOf(type.toUpperCase());
        return animalRepository.findByStatusAndType(animalStatus, animalType).stream()
                .map(this::toSummaryDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AnimalDetailDto createAnimal(CreateAnimalRequest request) {
        UUID previousOwnerId = null;
        
        if (request.getPreviousOwner() != null) {
            PreviousOwnerRequest ownerRequest = request.getPreviousOwner();
            
            PreviousOwner owner = previousOwnerRepository
                    .findByNameAndTelephone(ownerRequest.getName(), ownerRequest.getTelephone())
                    .orElseGet(() -> {
                        PreviousOwner newOwner = PreviousOwner.builder()
                                .name(ownerRequest.getName())
                                .telephone(ownerRequest.getTelephone())
                                .email(ownerRequest.getEmail())
                                .address(ownerRequest.getAddress())
                                .build();
                        return previousOwnerRepository.save(newOwner);
                    });
            
            previousOwnerId = owner.getId();
        }

        Animal animal = Animal.builder()
                .name(request.getName())
                .dateOfBirth(request.getDateOfBirth())
                .animalType(request.getAnimalType() != null ? AnimalType.valueOf(request.getAnimalType().toUpperCase()) : AnimalType.DOG)
                .breed(request.getBreed())
                .gender(request.getGender() != null ? AnimalGender.valueOf(request.getGender().toUpperCase()) : AnimalGender.UNKNOWN)
                .size(request.getSize() != null ? AnimalSize.valueOf(request.getSize().toUpperCase()) : AnimalSize.MEDIUM)
                .temperament(request.getTemperament())
                .status(request.getStatus() != null ? AnimalStatus.valueOf(request.getStatus().toUpperCase()) : AnimalStatus.AVAILABLE)
                .intakeDate(request.getIntakeDate())
                .description(request.getDescription())
                .imageUrl(request.getImageUrl())
                .previousOwnerId(previousOwnerId)
                .build();

        Animal savedAnimal = animalRepository.save(animal);
        log.info("Created animal with id: {}", savedAnimal.getId());
        
        return getAnimalById(savedAnimal.getId());
    }

    @Transactional
    public AnimalDetailDto updateAnimal(UUID id, UpdateAnimalRequest request) {
        Animal existingAnimal = animalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Animal not found with id: " + id));

        if (request.getName() != null) {
            existingAnimal.setName(request.getName());
        }
        if (request.getDateOfBirth() != null) {
            existingAnimal.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getAnimalType() != null) {
            existingAnimal.setAnimalType(AnimalType.valueOf(request.getAnimalType().toUpperCase()));
        }
        if (request.getBreed() != null) {
            existingAnimal.setBreed(request.getBreed());
        }
        if (request.getGender() != null) {
            existingAnimal.setGender(AnimalGender.valueOf(request.getGender().toUpperCase()));
        }
        if (request.getSize() != null) {
            existingAnimal.setSize(AnimalSize.valueOf(request.getSize().toUpperCase()));
        }
        if (request.getTemperament() != null) {
            existingAnimal.setTemperament(request.getTemperament());
        }
        if (request.getStatus() != null) {
            existingAnimal.setStatus(AnimalStatus.valueOf(request.getStatus().toUpperCase()));
        }
        if (request.getIntakeDate() != null) {
            existingAnimal.setIntakeDate(request.getIntakeDate());
        }
        if (request.getDescription() != null) {
            existingAnimal.setDescription(request.getDescription());
        }
        if (request.getImageUrl() != null) {
            existingAnimal.setImageUrl(request.getImageUrl());
        }
        if (request.getPreviousOwnerId() != null) {
            existingAnimal.setPreviousOwnerId(request.getPreviousOwnerId());
        }

        Animal updatedAnimal = animalRepository.save(existingAnimal);
        log.info("Updated animal with id: {}", id);
        
        return getAnimalById(updatedAnimal.getId());
    }

    @Transactional
    public void deleteAnimal(UUID id) {
        if (animalRepository.findById(id).isEmpty()) {
            throw new RuntimeException("Animal not found with id: " + id);
        }
        animalRepository.deleteById(id);
        log.info("Deleted animal with id: {}", id);
    }

    public List<AnimalSummaryDto> getAnimalsByPreviousOwner(UUID previousOwnerId) {
        return animalRepository.findByPreviousOwnerId(previousOwnerId).stream()
                .map(this::toSummaryDto)
                .collect(Collectors.toList());
    }

    private AnimalSummaryDto toSummaryDto(Animal animal) {
        return AnimalSummaryDto.builder()
                .id(animal.getId())
                .name(animal.getName())
                .animalType(animal.getAnimalType() != null ? animal.getAnimalType().name() : null)
                .breed(animal.getBreed())
                .status(animal.getStatus() != null ? animal.getStatus().name() : null)
                .imageUrl(animal.getImageUrl())
                .build();
    }

    private AnimalDetailDto toDetailDto(Animal animal) {
        PreviousOwnerDto previousOwnerDto = null;
        if (animal.getPreviousOwnerId() != null) {
            previousOwnerDto = previousOwnerRepository.findById(animal.getPreviousOwnerId())
                    .map(owner -> PreviousOwnerDto.builder()
                            .id(owner.getId())
                            .name(owner.getName())
                            .telephone(owner.getTelephone())
                            .email(owner.getEmail())
                            .address(owner.getAddress())
                            .build())
                    .orElse(null);
        }

        return AnimalDetailDto.builder()
                .id(animal.getId())
                .name(animal.getName())
                .dateOfBirth(animal.getDateOfBirth())
                .animalType(animal.getAnimalType())
                .breed(animal.getBreed())
                .gender(animal.getGender())
                .size(animal.getSize())
                .temperament(animal.getTemperament())
                .status(animal.getStatus())
                .intakeDate(animal.getIntakeDate())
                .description(animal.getDescription())
                .imageUrl(animal.getImageUrl())
                .previousOwner(previousOwnerDto)
                .createdAt(animal.getCreatedAt())
                .updatedAt(animal.getUpdatedAt())
                .build();
    }
}
