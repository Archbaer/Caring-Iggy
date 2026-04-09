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
import com.caringiggy.user.model.AccountProfileType;
import com.caringiggy.user.model.AccountRole;
import com.caringiggy.user.model.Employee;
import com.caringiggy.user.model.EmployeeRole;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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
        assertThat(result.response().getUser().getProfileType()).isEqualTo(AccountProfileType.ADOPTER.name());
        assertThat(result.response().getUser().getProfileId()).isEqualTo(profileId);

        ArgumentCaptor<CreateAdopterProfileRequest> adopterCaptor = ArgumentCaptor.forClass(CreateAdopterProfileRequest.class);
        ArgumentCaptor<Account> accountCaptor = ArgumentCaptor.forClass(Account.class);
        ArgumentCaptor<UserSession> sessionCaptor = ArgumentCaptor.forClass(UserSession.class);
        verify(adopterServiceClient).createAdopterProfile(adopterCaptor.capture());
        verify(accountRepository).insert(accountCaptor.capture());
        verify(userSessionRepository).insert(sessionCaptor.capture());
        assertThat(adopterCaptor.getValue().getStatus()).isEqualTo("PENDING_REVIEW");
        assertThat(adopterCaptor.getValue().getName()).isEqualTo("Ava Adopter");
        assertThat(accountCaptor.getValue().getProfileType()).isEqualTo(AccountProfileType.ADOPTER);
        assertThat(sessionCaptor.getValue().getTokenHash()).isNotEqualTo("opaque-session-token");
        assertThat(sessionCaptor.getValue().getTokenHash()).hasSize(64);
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
                .profileType(AccountProfileType.EMPLOYEE)
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
        assertThat(result.orElseThrow().getUser().getProfileType()).isEqualTo(AccountProfileType.EMPLOYEE.name());
        assertThat(result.orElseThrow().getUser().getAccountId()).isEqualTo(accountId);
        assertThat(result.orElseThrow().getUser().getProfileId()).isEqualTo(profileId);
        verify(userSessionRepository).touch(session.getId());
    }

    @Test
    void logout_deletesHashedSessionToken() {
        authService.logout("opaque-token");

        ArgumentCaptor<String> tokenHashCaptor = ArgumentCaptor.forClass(String.class);
        verify(userSessionRepository).deleteByTokenHash(tokenHashCaptor.capture());
        assertThat(tokenHashCaptor.getValue()).isNotEqualTo("opaque-token");
        assertThat(tokenHashCaptor.getValue()).hasSize(64);
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

    @Test
    void provisionStaffAccount_createsEmployeeLinkedCanonicalAccount() {
        UUID adminAccountId = UUID.randomUUID();
        UUID adminProfileId = UUID.randomUUID();
        UUID employeeProfileId = UUID.randomUUID();
        Account adminAccount = Account.builder()
                .id(adminAccountId)
                .email("admin@example.com")
                .passwordHash("hash")
                .role(AccountRole.ADMIN)
                .profileType(AccountProfileType.EMPLOYEE)
                .profileId(adminProfileId)
                .build();
        UserSession adminSession = UserSession.builder()
                .id(UUID.randomUUID())
                .accountId(adminAccountId)
                .tokenHash("ignored")
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();

        when(userSessionRepository.findByTokenHash(any())).thenReturn(Optional.of(adminSession));
        when(accountRepository.findById(adminAccountId)).thenReturn(Optional.of(adminAccount));
        when(accountRepository.findByEmail("staff@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("supersecret")).thenReturn("hashed-password");
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> {
            Employee employee = invocation.getArgument(0);
            employee.setId(employeeProfileId);
            return employee;
        });
        when(accountRepository.insert(any(Account.class))).thenAnswer(invocation -> {
            Account account = invocation.getArgument(0);
            account.setId(UUID.randomUUID());
            return account;
        });

        AuthResponse response = authService.provisionStaffAccount(ProvisionAccountRequest.builder()
                .name("Staff User")
                .email("staff@example.com")
                .telephone("555-0100")
                .password("supersecret")
                .role("ADMIN")
                .build(), "admin-session");

        ArgumentCaptor<Employee> employeeCaptor = ArgumentCaptor.forClass(Employee.class);
        ArgumentCaptor<Account> accountCaptor = ArgumentCaptor.forClass(Account.class);
        verify(employeeRepository).save(employeeCaptor.capture());
        verify(accountRepository).insert(accountCaptor.capture());

        assertThat(employeeCaptor.getValue().getRole()).isEqualTo(EmployeeRole.STAFF);
        assertThat(accountCaptor.getValue().getRole()).isEqualTo(AccountRole.STAFF);
        assertThat(accountCaptor.getValue().getProfileType()).isEqualTo(AccountProfileType.EMPLOYEE);
        assertThat(accountCaptor.getValue().getProfileId()).isEqualTo(employeeProfileId);
        assertThat(response.getUser().getRole()).isEqualTo(AccountRole.STAFF.name());
        assertThat(response.getUser().getProfileType()).isEqualTo(AccountProfileType.EMPLOYEE.name());
    }

    @Test
    void signupAdopter_rollsBackRemoteProfileWhenAccountInsertFails() {
        SignupRequest request = SignupRequest.builder()
                .firstName("Ava")
                .lastName("Adopter")
                .email("ava@example.com")
                .telephone("123456")
                .password("supersecret")
                .build();
        UUID profileId = UUID.randomUUID();

        when(accountRepository.findByEmail("ava@example.com")).thenReturn(Optional.empty());
        when(adopterServiceClient.createAdopterProfile(any(CreateAdopterProfileRequest.class)))
                .thenReturn(AdopterProfileDto.builder().id(profileId).build());
        when(passwordEncoder.encode("supersecret")).thenReturn("hashed-password");
        when(accountRepository.insert(any(Account.class))).thenThrow(new RuntimeException("boom"));

        assertThatThrownBy(() -> authService.signupAdopter(request)).isInstanceOf(RuntimeException.class);

        verify(adopterServiceClient).deleteAdopterProfile(profileId);
        verify(userSessionRepository, never()).insert(any(UserSession.class));
    }
}
