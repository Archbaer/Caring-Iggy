/** Canonical frontend role union — never expose backend EmployeeRole names. */
export type Role = "ADOPTER" | "STAFF" | "ADMIN";

/** Session payload returned by /api/auth/session — minimal, role-normalized. */
export interface SessionUser {
  role: Role;
  /** Opaque account identifier (UUID string). */
  accountId: string;
  /** Linked profile identity when present (adopterId or employeeId). */
  profileId?: string;
}

export interface AuthSessionSnapshot {
  user: SessionUser | null;
  csrfToken: string;
}

export interface AuthMutationResult {
  user: SessionUser;
  csrfToken: string;
}

export interface LogoutResult {
  ok: true;
  csrfToken: string;
}

/** Shape of the signed CSRF token pair (cookie + header value). */
export interface CsrfToken {
  token: string;
}

/** BFF error envelope — single shape for all API error responses. */
export interface BffError {
  /** HTTP status code. */
  status: number;
  /** Machine-readable error code (e.g. "UNAUTHORIZED", "FORBIDDEN", "VALIDATION"). */
  code: string;
  /** Human-readable message safe for display. */
  message: string;
  /** Per-field validation errors when code === "VALIDATION". */
  fieldErrors?: Record<string, string[]>;
}

/** Login request body sent to /api/auth/login. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Signup request body sent to /api/auth/signup. */
export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  password: string;
}

/** Generic API response wrapper for typed results. */
export interface ApiResponse<T> {
  data: T;
  error?: BffError;
}
