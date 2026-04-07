/**
 * Adopter type contracts for dashboard preferences and interests.
 */

/** Adopter preference categories. */
export interface AdopterPreferences {
  preferredAnimalTypes: string[];
  maxAge?: number;
  minAge?: number;
  /** Additional free-text preferences. */
  notes?: string;
}

/** An animal that an adopter has expressed interest in. */
export interface AdopterInterest {
  animalId: string;
  /** ISO-8601 timestamp when interest was recorded. */
  createdAt: string;
}

/** Adopter profile returned from session-linked identity. */
export interface AdopterProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  preferences: AdopterPreferences | null;
  interests: AdopterInterest[];
}

/** Max number of active interests allowed per adopter. */
export const MAX_INTERESTS = 3;

/** Request body for updating adopter preferences. */
export interface UpdatePreferencesRequest {
  preferences: AdopterPreferences;
}

/** Request body for adding an animal interest. */
export interface AddInterestRequest {
  animalId: string;
}
