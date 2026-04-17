import type { AnimalStatusLabel } from "@/lib/constants/status-map";

/**
 * Animal type contracts aligned with backend AnimalSummaryDto.
 * Frontend-facing shape — backend DTO fields mapped to stable names.
 */

/** Backend animal status codes (source of truth from animal-service). */
export type AnimalStatusCode =
  | "AVAILABLE"
  | "PENDING"
  | "ADOPTED"
  | "IN_TREATMENT"
  | "DECEASED";

export type AnimalGender = "MALE" | "FEMALE" | "UNKNOWN";

export type AnimalSize = "SMALL" | "MEDIUM" | "LARGE";

export interface PreviousOwner {
  id: string;
  name: string;
  telephone: string;
  email?: string;
  address?: string;
}

/** Summary shape returned from animal list endpoints. */
export interface AnimalSummary {
  id: string;
  name: string;
  animalType: string;
  breed: string;
  status: AnimalStatusCode;
  imageUrl: string | null;
}

/** Full animal detail — extends summary with additional fields when available. */
export interface AnimalDetail extends AnimalSummary {
  dateOfBirth?: string;
  description?: string;
  gender?: AnimalGender;
  size?: AnimalSize;
  temperament?: string;
  intakeDate?: string;
  previousOwner?: PreviousOwner;
  age?: number;
  sex?: "MALE" | "FEMALE";
  /** Derived display label, computed server-side via status-map. */
  statusLabel?: AnimalStatusLabel;
}

export interface AnimalCreateRequest {
  name: string;
  dateOfBirth?: string;
  animalType?: string;
  breed?: string;
  gender?: AnimalGender;
  size?: AnimalSize;
  temperament?: string;
  status?: AnimalStatusCode;
  intakeDate?: string;
  description?: string;
  imageUrl?: string;
  previousOwner?: {
    name: string;
    telephone: string;
    email?: string;
    address?: string;
  };
}

export interface AnimalUpdateRequest {
  name?: string;
  dateOfBirth?: string;
  animalType?: string;
  breed?: string;
  gender?: AnimalGender;
  size?: AnimalSize;
  temperament?: string;
  status?: AnimalStatusCode;
  intakeDate?: string;
  description?: string;
  imageUrl?: string;
  previousOwnerId?: string;
}

/** Query params for animal list filtering. */
export interface AnimalListParams {
  status?: AnimalStatusCode;
  type?: string;
  sex?: string;
  size?: string;
}
