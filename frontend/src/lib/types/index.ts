export type {
  Role,
  SessionUser,
  AuthSessionSnapshot,
  AuthMutationResult,
  LogoutResult,
  CsrfToken,
  BffError,
  LoginRequest,
  SignupRequest,
  ApiResponse,
} from "./auth";

export type {
  AnimalStatusCode,
  AnimalGender,
  AnimalSize,
  AnimalSummary,
  AnimalDetail,
  AnimalListParams,
  PreviousOwner,
  AnimalCreateRequest,
  AnimalUpdateRequest,
} from "./animal";

export type { AnimalStatusLabel } from "../constants/status-map";

export type {
  AdopterPreferences,
  AdopterInterest,
  AdopterProfile,
  UpdatePreferencesRequest,
  UpdateInterestsRequest,
} from "./adopter";

export { MAX_INTERESTS } from "./adopter";
