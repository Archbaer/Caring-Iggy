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
  description?: string;
  age?: number;
  sex?: "MALE" | "FEMALE";
  /** Derived display label, computed server-side via status-map. */
  statusLabel?: AnimalStatusLabel;
}

/** Query params for animal list filtering. */
export interface AnimalListParams {
  status?: AnimalStatusCode;
  type?: string;
}
