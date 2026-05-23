package com.caringiggy.animal.service;

import com.caringiggy.animal.dto.AnimalDetailDto;
import com.caringiggy.animal.dto.AnimalSummaryDto;
import com.caringiggy.animal.dto.CreateAnimalRequest;
import com.caringiggy.animal.dto.PreviousOwnerRequest;
import com.caringiggy.animal.dto.UpdateAnimalRequest;
import com.caringiggy.animal.exception.NotFoundException;
import com.caringiggy.animal.model.Animal;
import com.caringiggy.animal.model.AnimalGender;
import com.caringiggy.animal.model.AnimalSize;
import com.caringiggy.animal.model.AnimalStatus;
import com.caringiggy.animal.model.AnimalType;
import com.caringiggy.animal.model.PreviousOwner;
import com.caringiggy.animal.repository.AnimalRepository;
import com.caringiggy.animal.repository.PreviousOwnerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnimalServiceTest {

    @Mock
    private AnimalRepository animalRepository;

    @Mock
    private PreviousOwnerRepository previousOwnerRepository;

    @InjectMocks
    private AnimalService animalService;

    // ─── createAnimal ────────────────────────────────────────────────────────

    @Test
    void createAnimal_mapsRequestFieldsToEntityAndReturnsDto() {
        UUID animalId = UUID.randomUUID();
        Animal saved = animal(animalId, "Mochi", AnimalType.DOG, AnimalGender.FEMALE, AnimalSize.MEDIUM, AnimalStatus.AVAILABLE);

        when(animalRepository.save(any(Animal.class))).thenReturn(saved);
        when(animalRepository.findById(animalId)).thenReturn(Optional.of(saved));

        CreateAnimalRequest request = CreateAnimalRequest.builder()
                .name("Mochi")
                .animalType("DOG")
                .gender("FEMALE")
                .size("MEDIUM")
                .status("AVAILABLE")
                .build();

        AnimalDetailDto result = animalService.createAnimal(request);

        assertThat(result.getName()).isEqualTo("Mochi");
        assertThat(result.getAnimalType()).isEqualTo(AnimalType.DOG);
        assertThat(result.getGender()).isEqualTo(AnimalGender.FEMALE);
        assertThat(result.getSize()).isEqualTo(AnimalSize.MEDIUM);
        assertThat(result.getStatus()).isEqualTo(AnimalStatus.AVAILABLE);

        ArgumentCaptor<Animal> captor = ArgumentCaptor.forClass(Animal.class);
        verify(animalRepository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Mochi");
        assertThat(captor.getValue().getAnimalType()).isEqualTo(AnimalType.DOG);
    }

    @Test
    void createAnimal_withNullEnumFields_usesServiceDefaults() {
        UUID animalId = UUID.randomUUID();
        Animal saved = animal(animalId, "Buddy", AnimalType.DOG, AnimalGender.UNKNOWN, AnimalSize.MEDIUM, AnimalStatus.AVAILABLE);

        when(animalRepository.save(any(Animal.class))).thenReturn(saved);
        when(animalRepository.findById(animalId)).thenReturn(Optional.of(saved));

        animalService.createAnimal(CreateAnimalRequest.builder().name("Buddy").build());

        ArgumentCaptor<Animal> captor = ArgumentCaptor.forClass(Animal.class);
        verify(animalRepository).save(captor.capture());
        assertThat(captor.getValue().getAnimalType()).isEqualTo(AnimalType.DOG);
        assertThat(captor.getValue().getGender()).isEqualTo(AnimalGender.UNKNOWN);
        assertThat(captor.getValue().getSize()).isEqualTo(AnimalSize.MEDIUM);
        assertThat(captor.getValue().getStatus()).isEqualTo(AnimalStatus.AVAILABLE);
    }

    @Test
    void createAnimal_withInvalidAnimalType_throwsIllegalArgumentException() {
        CreateAnimalRequest request = CreateAnimalRequest.builder()
                .name("Mochi")
                .animalType("DRAGON")
                .build();

        assertThatThrownBy(() -> animalService.createAnimal(request))
                .isInstanceOf(IllegalArgumentException.class);

        verify(animalRepository, never()).save(any());
    }

    @Test
    void createAnimal_withNewPreviousOwner_savesOwnerThenLinksToAnimal() {
        UUID ownerId = UUID.randomUUID();
        UUID animalId = UUID.randomUUID();
        PreviousOwner newOwner = PreviousOwner.builder().id(ownerId).name("Taylor").telephone("555-0100").build();
        Animal saved = animal(animalId, "Mochi", AnimalType.CAT, null, null, AnimalStatus.AVAILABLE);
        saved.setPreviousOwnerId(ownerId);

        when(previousOwnerRepository.findByNameAndTelephone("Taylor", "555-0100")).thenReturn(Optional.empty());
        when(previousOwnerRepository.save(any(PreviousOwner.class))).thenReturn(newOwner);
        when(animalRepository.save(any(Animal.class))).thenReturn(saved);
        when(animalRepository.findById(animalId)).thenReturn(Optional.of(saved));
        when(previousOwnerRepository.findById(ownerId)).thenReturn(Optional.of(newOwner));

        animalService.createAnimal(CreateAnimalRequest.builder()
                .name("Mochi")
                .animalType("CAT")
                .previousOwner(PreviousOwnerRequest.builder().name("Taylor").telephone("555-0100").build())
                .build());

        verify(previousOwnerRepository).save(any(PreviousOwner.class));
    }

    @Test
    void createAnimal_withExistingPreviousOwner_reusesOwnerWithoutSaving() {
        UUID ownerId = UUID.randomUUID();
        UUID animalId = UUID.randomUUID();
        PreviousOwner existing = PreviousOwner.builder().id(ownerId).name("Taylor").telephone("555-0100").build();
        Animal saved = animal(animalId, "Mochi", AnimalType.CAT, null, null, AnimalStatus.AVAILABLE);
        saved.setPreviousOwnerId(ownerId);

        when(previousOwnerRepository.findByNameAndTelephone("Taylor", "555-0100")).thenReturn(Optional.of(existing));
        when(animalRepository.save(any(Animal.class))).thenReturn(saved);
        when(animalRepository.findById(animalId)).thenReturn(Optional.of(saved));
        when(previousOwnerRepository.findById(ownerId)).thenReturn(Optional.of(existing));

        animalService.createAnimal(CreateAnimalRequest.builder()
                .name("Mochi")
                .animalType("CAT")
                .previousOwner(PreviousOwnerRequest.builder().name("Taylor").telephone("555-0100").build())
                .build());

        verify(previousOwnerRepository, never()).save(any());
    }

    // ─── getAnimalById ───────────────────────────────────────────────────────

    @Test
    void getAnimalById_throwsNotFoundWhenMissing() {
        UUID id = UUID.randomUUID();
        when(animalRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> animalService.getAnimalById(id))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(id.toString());
    }

    // ─── updateAnimal ────────────────────────────────────────────────────────

    @Test
    void updateAnimal_mergesOnlyNonNullFields() {
        UUID id = UUID.randomUUID();
        Animal existing = animal(id, "OldName", AnimalType.DOG, AnimalGender.MALE, AnimalSize.SMALL, AnimalStatus.AVAILABLE);
        Animal afterUpdate = animal(id, "NewName", AnimalType.DOG, AnimalGender.MALE, AnimalSize.SMALL, AnimalStatus.PENDING);

        // First findById = initial lookup; second = post-save lookup inside getAnimalById
        when(animalRepository.findById(id))
                .thenReturn(Optional.of(existing))
                .thenReturn(Optional.of(afterUpdate));
        when(animalRepository.save(any(Animal.class))).thenReturn(afterUpdate);

        animalService.updateAnimal(id, UpdateAnimalRequest.builder().name("NewName").status("PENDING").build());

        ArgumentCaptor<Animal> captor = ArgumentCaptor.forClass(Animal.class);
        verify(animalRepository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("NewName");
        assertThat(captor.getValue().getStatus()).isEqualTo(AnimalStatus.PENDING);
        assertThat(captor.getValue().getGender()).isEqualTo(AnimalGender.MALE);
        assertThat(captor.getValue().getSize()).isEqualTo(AnimalSize.SMALL);
    }

    @Test
    void updateAnimal_throwsNotFoundWhenMissing() {
        UUID id = UUID.randomUUID();
        when(animalRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> animalService.updateAnimal(id, UpdateAnimalRequest.builder().build()))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(id.toString());
    }

    // ─── deleteAnimal ────────────────────────────────────────────────────────

    @Test
    void deleteAnimal_throwsNotFoundWhenMissing() {
        UUID id = UUID.randomUUID();
        when(animalRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> animalService.deleteAnimal(id))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(id.toString());
    }

    // ─── getAnimalsByStatus ──────────────────────────────────────────────────

    @Test
    void getAnimalsByStatus_withInvalidStatus_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> animalService.getAnimalsByStatus("LOST"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void getAnimalsByStatus_filtersCorrectlyAndMapsToSummaryDto() {
        UUID id = UUID.randomUUID();
        when(animalRepository.findByStatus(AnimalStatus.AVAILABLE))
                .thenReturn(List.of(animal(id, "Mochi", AnimalType.DOG, null, null, AnimalStatus.AVAILABLE)));

        List<AnimalSummaryDto> result = animalService.getAnimalsByStatus("AVAILABLE");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Mochi");
        assertThat(result.get(0).getStatus()).isEqualTo("AVAILABLE");
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private Animal animal(UUID id, String name, AnimalType type, AnimalGender gender,
                          AnimalSize size, AnimalStatus status) {
        return Animal.builder()
                .id(id).name(name).animalType(type).gender(gender).size(size).status(status)
                .build();
    }
}
