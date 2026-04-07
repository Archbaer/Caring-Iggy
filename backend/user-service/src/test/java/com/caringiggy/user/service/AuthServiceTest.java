package com.caringiggy.user.service;

import com.caringiggy.user.client.AdopterServiceClient;
import com.caringiggy.user.config.AuthProperties;
import com.caringiggy.user.dto.AdopterProfileDto;
import com.caringiggy.user.dto.AuthResponse;
import com.caringiggy.user.dto.CreateAdopterProfileRequest;
import com.caringiggy.user.dto.LoginRequest;
import com.caringiggy.user.dto.ProvisionAccountRequest;
import com.caringiggy.user.dto.SignupRequest;
import com.caringiggy.user.exception.ApiException;
import com.caringiggy.user.model.Account;
import com.caringiggy.user.model.AccountRole;
import com.caringiggy.user.model.UserSession;
import com.caringiggy.user.repository.AccountRepository;
import com.caringiggy.user.repository.EmployeeRepository;
import com.caringiggy.user.repository.UserSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AccountRepository accountRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private UserSessionRepository userSessionRepository;
    @Mock
    private AdopterServiceClient adopterServiceClient;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private SessionTokenGenerator sessionTokenGenerator;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                accountRepository,
                employeeRepository,
                userSessionRepository,
                adopterServiceClient,
                passwordEncoder,
                sessionTokenGenerator,
                new AuthProperties(Duration.ofHours(24), false)
        );
    }

    @Test
    void signupAdopter_createsCanonicalAccountAndSession() {
        SignupRequest request = SignupRequest.builder()
                .firstName("Ava")
                .lastName("Adopter")
                .email("ava@example.com")
                .telephone("123456")
                .password("supersecret")
                .build();

        UUID profileId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        when(accountRepository.findByEmail("ava@example.com")).thenReturn(Optional.empty());
        when(adopterServiceClient.createAdopterProfile(any(CreateAdopterProfileRequest.class)))
                .thenReturn(AdopterProfileDto.builder().id(profileId).build());
        when(passwordEncoder.encode("supersecret")).thenReturn("hashed-password");
        when(accountRepository.insert(any(Account.class))).thenAnswer(invocation -> {
            Account account = invocation.getArgument(0);
            account.setId(accountId);
            return account;
        });
        when(sessionTokenGenerator.generate()).thenReturn("opaque-session-token");
        when(userSessionRepository.insert(any(UserSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthService.AuthenticatedSession result = authService.signupAdopter(request);

        assertThat(result.sessionToken()).isEqualTo("opaque-session-token");
        assertThat(result.response().getUser().getRole()).isEqualTo(AccountRole.ADOPTER.name());
        assertThat(result.response().getUser().getProfileId()).isEqualTo(profileId);

        ArgumentCaptor<CreateAdopterProfileRequest> adopterCaptor = ArgumentCaptor.forClass(CreateAdopterProfileRequest.class);
        verify(adopterServiceClient).createAdopterProfile(adopterCaptor.capture());
        assertThat(adopterCaptor.getValue().getStatus()).isEqualTo("PENDING_REVIEW");
        assertThat(adopterCaptor.getValue().getName()).isEqualTo("Ava Adopter");
    }

    @Test
    void login_rejectsInvalidPassword() {
        Account account = Account.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .passwordHash("stored-hash")
                .role(AccountRole.STAFF)
                .profileId(UUID.randomUUID())
                .build();

        when(accountRepository.findByEmail("user@example.com")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("wrong", "stored-hash")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(LoginRequest.builder()
                .email("user@example.com")
                .password("wrong")
                .build()))
                .isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void validateSession_returnsCanonicalPayloadForActiveSession() {
        UUID accountId = UUID.randomUUID();
        UUID profileId = UUID.randomUUID();
        Account account = Account.builder()
                .id(accountId)
                .email("admin@example.com")
                .passwordHash("hash")
                .role(AccountRole.ADMIN)
                .profileId(profileId)
                .build();
        UserSession session = UserSession.builder()
                .id(UUID.randomUUID())
                .accountId(accountId)
                .tokenHash("ignored")
                .expiresAt(LocalDateTime.now().plusHours(4))
                .build();

        when(userSessionRepository.findByTokenHash(any())).thenReturn(Optional.of(session));
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));

        Optional<AuthResponse> result = authService.validateSession("opaque-token");

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getUser().getRole()).isEqualTo(AccountRole.ADMIN.name());
        assertThat(result.orElseThrow().getUser().getAccountId()).isEqualTo(accountId);
        assertThat(result.orElseThrow().getUser().getProfileId()).isEqualTo(profileId);
        verify(userSessionRepository).touch(session.getId());
    }

    @Test
    void provisionEmployeeAccount_requiresAdminSession() {
        when(userSessionRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.provisionEmployeeAccount(
                ProvisionAccountRequest.builder()
                        .name("Admin User")
                        .email("admin@example.com")
                        .password("supersecret")
                        .role("ADMIN")
                        .build(),
                "missing-session"
        )).isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
