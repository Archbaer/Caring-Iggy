export type {
  Role,
  SessionUser,
  CsrfToken,
  BffError,
  LoginRequest,
  SignupRequest,
  ApiResponse,
} from "./auth";

export type {
  AnimalStatusCode,
  AnimalSummary,
  AnimalDetail,
  AnimalListParams,
} from "./animal";

export type { AnimalStatusLabel } from "../constants/status-map";

export type {
  AdopterPreferences,
  AdopterInterest,
  AdopterProfile,
  UpdatePreferencesRequest,
  AddInterestRequest,
} from "./adopter";

export { MAX_INTERESTS } from "./adopter";
