package com.caringiggy.user.service;

import com.caringiggy.user.client.AdopterServiceClient;
import com.caringiggy.user.config.AuthProperties;
import com.caringiggy.user.dto.*;
import com.caringiggy.user.exception.ApiException;
import com.caringiggy.user.model.*;
import com.caringiggy.user.repository.AccountRepository;
import com.caringiggy.user.repository.EmployeeRepository;
import com.caringiggy.user.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    public static final String SESSION_COOKIE_NAME = "session";

    private final AccountRepository accountRepository;
    private final EmployeeRepository employeeRepository;
    private final UserSessionRepository userSessionRepository;
    private final AdopterServiceClient adopterServiceClient;
    private final PasswordEncoder passwordEncoder;
    private final SessionTokenGenerator sessionTokenGenerator;
    private final AuthProperties authProperties;

    @Transactional
    public AuthenticatedSession signupAdopter(SignupRequest request) {
        ensureEmailAvailable(request.getEmail());

        UUID adopterProfileId = null;
        try {
            AdopterProfileDto adopterProfile = adopterServiceClient.createAdopterProfile(CreateAdopterProfileRequest.builder()
                    .name(buildFullName(request.getFirstName(), request.getLastName()))
                    .email(normalizeEmail(request.getEmail()))
                    .telephone(request.getTelephone())
                    .status("PENDING_REVIEW")
                    .build());
            adopterProfileId = adopterProfile.getId();

            Account account = accountRepository.insert(Account.builder()
                    .email(normalizeEmail(request.getEmail()))
                    .passwordHash(passwordEncoder.encode(request.getPassword()))
                    .role(AccountRole.ADOPTER)
                    .profileType(AccountProfileType.ADOPTER)
                    .profileId(adopterProfileId)
                    .build());

            return createAuthenticatedSession(account);
        } catch (RuntimeException exception) {
            if (adopterProfileId != null) {
                adopterServiceClient.deleteAdopterProfile(adopterProfileId);
            }
            throw exception;
        }
    }

    @Transactional
    public AuthResponse provisionEmployeeAccount(ProvisionAccountRequest request, String sessionToken) {
        requireAdminSession(sessionToken);

        AccountRole role = parseProvisionRole(request.getRole());
        ensureEmailAvailable(request.getEmail());

        Employee employee = employeeRepository.save(Employee.builder()
                .name(request.getName())
                .email(normalizeEmail(request.getEmail()))
                .telephone(request.getTelephone())
                .role(role == AccountRole.ADMIN ? EmployeeRole.ADMIN : EmployeeRole.STAFF)
                .build());

        Account account = accountRepository.insert(Account.builder()
                .email(normalizeEmail(request.getEmail()))
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .profileType(AccountProfileType.EMPLOYEE)
                .profileId(employee.getId())
                .build());

        return toAuthResponse(account, LocalDateTime.now().plus(authProperties.ttl()));
    }

    @Transactional
    public AuthenticatedSession login(LoginRequest request) {
        Account account = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        return createAuthenticatedSession(account);
    }

    @Transactional
    public void logout(String sessionToken) {
        if (sessionToken == null || sessionToken.isBlank()) {
            return;
        }

        userSessionRepository.deleteByTokenHash(hashToken(sessionToken));
    }

    @Transactional
    public Optional<AuthResponse> validateSession(String sessionToken) {
        if (sessionToken == null || sessionToken.isBlank()) {
            return Optional.empty();
        }

        userSessionRepository.deleteExpiredSessions();

        Optional<UserSession> session = userSessionRepository.findByTokenHash(hashToken(sessionToken));
        if (session.isEmpty() || session.get().getExpiresAt().isBefore(LocalDateTime.now())) {
            session.ifPresent(found -> userSessionRepository.deleteByTokenHash(found.getTokenHash()));
            return Optional.empty();
        }

        Account account = accountRepository.findById(session.get().getAccountId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session account no longer exists"));
        userSessionRepository.touch(session.get().getId());
        return Optional.of(toAuthResponse(account, session.get().getExpiresAt()));
    }

    public ResponseCookie buildSessionCookie(String token, LocalDateTime expiresAt) {
        long maxAgeSeconds = Math.max(0, expiresAt.toEpochSecond(ZoneOffset.UTC) - LocalDateTime.now().toEpochSecond(ZoneOffset.UTC));
        return ResponseCookie.from(SESSION_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(authProperties.cookieSecure())
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAgeSeconds)
                .build();
    }

    public ResponseCookie clearSessionCookie() {
        return ResponseCookie.from(SESSION_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(authProperties.cookieSecure())
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
    }

    @Transactional
    public AuthResponse provisionStaffAccount(ProvisionAccountRequest request, String sessionToken) {
        ProvisionAccountRequest normalizedRequest = copyProvisionRequestWithRole(request, AccountRole.STAFF);
        return provisionEmployeeAccount(normalizedRequest, sessionToken);
    }

    @Transactional
    public AuthResponse provisionAdminAccount(ProvisionAccountRequest request, String sessionToken) {
        ProvisionAccountRequest normalizedRequest = copyProvisionRequestWithRole(request, AccountRole.ADMIN);
        return provisionEmployeeAccount(normalizedRequest, sessionToken);
    }

    public void requireAdminSession(String sessionToken) {
        Account account = requireAuthenticatedAccount(sessionToken);
        if (account.getRole() != AccountRole.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only admins can access employee management");
        }
    }

    private AuthenticatedSession createAuthenticatedSession(Account account) {
        String token = sessionTokenGenerator.generate();
        LocalDateTime expiresAt = LocalDateTime.now().plus(authProperties.ttl());

        userSessionRepository.insert(UserSession.builder()
                .accountId(account.getId())
                .tokenHash(hashToken(token))
                .expiresAt(expiresAt)
                .build());

        return new AuthenticatedSession(token, toAuthResponse(account, expiresAt));
    }

    private AuthResponse toAuthResponse(Account account, LocalDateTime expiresAt) {
        SessionUserDto sessionUser = SessionUserDto.builder()
                .accountId(account.getId())
                .role(account.getRole().name())
                .profileType(account.getProfileType().name())
                .profileId(account.getProfileId())
                .build();

        return AuthResponse.builder()
                .user(sessionUser)
                .accountId(sessionUser.getAccountId().toString())
                .role(sessionUser.getRole())
                .profileType(sessionUser.getProfileType())
                .profileId(sessionUser.getProfileId() != null ? sessionUser.getProfileId().toString() : null)
                .expiresAtEpochSeconds(expiresAt.toEpochSecond(ZoneOffset.UTC))
                .build();
    }

    private Account requireAuthenticatedAccount(String sessionToken) {
        return validateSession(sessionToken)
                .map(AuthResponse::getUser)
                .map(SessionUserDto::getAccountId)
                .flatMap(accountRepository::findById)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required"));
    }

    private AccountRole parseProvisionRole(String value) {
        try {
            AccountRole role = AccountRole.valueOf(value.trim().toUpperCase());
            if (!role.isEmployeeRole()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Provisioning only supports STAFF or ADMIN accounts");
            }
            return role;
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Provisioning only supports STAFF or ADMIN accounts");
        }
    }

    private void ensureEmailAvailable(String email) {
        if (accountRepository.findByEmail(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "An account already exists for that email address");
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String buildFullName(String firstName, String lastName) {
        return firstName.trim() + " " + lastName.trim();
    }

    private ProvisionAccountRequest copyProvisionRequestWithRole(ProvisionAccountRequest request, AccountRole role) {
        return ProvisionAccountRequest.builder()
                .name(request.getName())
                .email(request.getEmail())
                .telephone(request.getTelephone())
                .password(request.getPassword())
                .role(role.name())
                .build();
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            log.error("SHA-256 not available", exception);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to process session tokens");
        }
    }

    public record AuthenticatedSession(String sessionToken, AuthResponse response) {
    }
}
