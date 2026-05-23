package com.caringiggy.adopter.service;

import com.caringiggy.adopter.dto.AdopterDto;
import com.caringiggy.adopter.dto.CreateAdopterRequest;
import com.caringiggy.adopter.dto.CreateAdoptionHistoryRequest;
import com.caringiggy.adopter.dto.UpdateAdopterRequest;
import com.caringiggy.adopter.exception.NotFoundException;
import com.caringiggy.adopter.model.Adopter;
import com.caringiggy.adopter.model.AdopterStatus;
import com.caringiggy.adopter.model.AdoptionHistory;
import com.caringiggy.adopter.repository.AdopterRepository;
import com.caringiggy.adopter.repository.AdoptionHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdopterServiceTest {

    @Mock
    private AdopterRepository adopterRepository;

    @Mock
    private AdoptionHistoryRepository adoptionHistoryRepository;

    @InjectMocks
    private AdopterService adopterService;

    // ─── createAdopter ───────────────────────────────────────────────────────

    @Test
    void createAdopter_defaultsStatusToActiveWhenStatusIsNull() {
        UUID id = UUID.randomUUID();
        when(adopterRepository.save(any(Adopter.class)))
                .thenReturn(adopter(id, "Ava", "555-0100", AdopterStatus.ACTIVE));

        adopterService.createAdopter(CreateAdopterRequest.builder()
                .name("Ava").telephone("555-0100").build());

        ArgumentCaptor<Adopter> captor = ArgumentCaptor.forClass(Adopter.class);
        verify(adopterRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(AdopterStatus.ACTIVE);
    }

    @Test
    void createAdopter_usesExplicitStatusWhenProvided() {
        UUID id = UUID.randomUUID();
        when(adopterRepository.save(any(Adopter.class)))
                .thenReturn(adopter(id, "Ava", "555-0100", AdopterStatus.PENDING_REVIEW));

        adopterService.createAdopter(CreateAdopterRequest.builder()
                .name("Ava").telephone("555-0100").status("PENDING_REVIEW").build());

        ArgumentCaptor<Adopter> captor = ArgumentCaptor.forClass(Adopter.class);
        verify(adopterRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(AdopterStatus.PENDING_REVIEW);
    }

    @Test
    void createAdopter_withInvalidStatus_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> adopterService.createAdopter(
                CreateAdopterRequest.builder().name("Ava").telephone("555-0100").status("BANNED").build()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ─── getAdopterById ──────────────────────────────────────────────────────

    @Test
    void getAdopterById_throwsNotFoundWhenMissing() {
        UUID id = UUID.randomUUID();
        when(adopterRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adopterService.getAdopterById(id))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(id.toString());
    }

    // ─── updateAdopter ───────────────────────────────────────────────────────

    @Test
    void updateAdopter_mergesOnlyNonNullFields() {
        UUID id = UUID.randomUUID();
        Adopter existing = adopter(id, "OldName", "555-0001", AdopterStatus.ACTIVE);
        existing.setEmail("old@example.com");

        when(adopterRepository.findById(id)).thenReturn(Optional.of(existing));
        when(adopterRepository.save(any(Adopter.class))).thenAnswer(inv -> inv.getArgument(0));

        AdopterDto result = adopterService.updateAdopter(id,
                UpdateAdopterRequest.builder().name("NewName").build());

        assertThat(result.getName()).isEqualTo("NewName");
        assertThat(result.getEmail()).isEqualTo("old@example.com");
        assertThat(result.getTelephone()).isEqualTo("555-0001");
    }

    @Test
    void updateAdopter_throwsNotFoundWhenMissing() {
        UUID id = UUID.randomUUID();
        when(adopterRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adopterService.updateAdopter(id, UpdateAdopterRequest.builder().build()))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(id.toString());
    }

    // ─── deleteAdopter ───────────────────────────────────────────────────────

    @Test
    void deleteAdopter_throwsNotFoundWhenMissing() {
        UUID id = UUID.randomUUID();
        when(adopterRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adopterService.deleteAdopter(id))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(id.toString());
    }

    // ─── getAdoptersByStatus ─────────────────────────────────────────────────

    @Test
    void getAdoptersByStatus_withInvalidStatus_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> adopterService.getAdoptersByStatus("BANNED"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ─── createAdoptionHistory ───────────────────────────────────────────────

    @Test
    void createAdoptionHistory_defaultsDateToTodayWhenAdoptionDateIsNull() {
        UUID adopterId = UUID.randomUUID();
        UUID animalId = UUID.randomUUID();
        UUID historyId = UUID.randomUUID();

        when(adopterRepository.findById(adopterId))
                .thenReturn(Optional.of(adopter(adopterId, "Ava", "555-0100", AdopterStatus.ACTIVE)));
        when(adoptionHistoryRepository.save(any(AdoptionHistory.class))).thenAnswer(inv -> {
            AdoptionHistory h = inv.getArgument(0);
            h.setId(historyId);
            return h;
        });

        adopterService.createAdoptionHistory(CreateAdoptionHistoryRequest.builder()
                .adopterId(adopterId).animalId(animalId).build());

        ArgumentCaptor<AdoptionHistory> captor = ArgumentCaptor.forClass(AdoptionHistory.class);
        verify(adoptionHistoryRepository).save(captor.capture());
        assertThat(captor.getValue().getAdoptionDate()).isEqualTo(LocalDate.now());
    }

    @Test
    void createAdoptionHistory_throwsNotFoundWhenAdopterMissing() {
        UUID adopterId = UUID.randomUUID();
        when(adopterRepository.findById(adopterId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adopterService.createAdoptionHistory(
                CreateAdoptionHistoryRequest.builder()
                        .adopterId(adopterId).animalId(UUID.randomUUID()).build()))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(adopterId.toString());
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private Adopter adopter(UUID id, String name, String telephone, AdopterStatus status) {
        return Adopter.builder()
                .id(id).name(name).telephone(telephone).status(status)
                .interestedAnimals(List.of()).build();
    }
}
