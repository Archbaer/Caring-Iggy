/**
 * Adopter type contracts for dashboard preferences and interests.
 */

/** Adopter preference categories. */
export interface AdopterPreferences {
  preferredAnimalTypes: string[];
  preferredBreeds?: string[];
  maxAge?: number;
  minAge?: number;
  preferredGenders?: ("MALE" | "FEMALE" | "UNKNOWN")[];
  preferredSizes?: ("SMALL" | "MEDIUM" | "LARGE")[];
  preferredTemperaments?: string[];
  /** Additional free-text preferences. */
  notes?: string;
}

/** An animal that an adopter has expressed interest in. */
export interface AdopterInterest {
  animalId: string;
}

/** Adopter profile returned from session-linked identity. */
export interface AdopterProfile {
  id: string;
  name: string;
  email: string;
  telephone: string;
  status: string;
  preferences: AdopterPreferences;
  interests: AdopterInterest[];
}

/** Max number of active interests allowed per adopter. */
export const MAX_INTERESTS = 3;

/** Request body for updating adopter preferences. */
export interface UpdatePreferencesRequest {
  preferences: AdopterPreferences;
}

/** Request body for adding an animal interest. */
export interface UpdateInterestsRequest {
  interestedAnimalIds: string[];
}
