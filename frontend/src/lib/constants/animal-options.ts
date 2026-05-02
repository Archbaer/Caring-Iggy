import type { AnimalGender, AnimalSize, AnimalStatusCode } from "@/lib/types";

export const STATUS_OPTIONS: readonly AnimalStatusCode[] = [
  "AVAILABLE",
  "PENDING",
  "ADOPTED",
  "IN_TREATMENT",
  "DECEASED",
] as const;

export const GENDER_OPTIONS: readonly AnimalGender[] = [
  "MALE",
  "FEMALE",
  "UNKNOWN",
] as const;

export const SIZE_OPTIONS: readonly AnimalSize[] = [
  "SMALL",
  "MEDIUM",
  "LARGE",
] as const;
