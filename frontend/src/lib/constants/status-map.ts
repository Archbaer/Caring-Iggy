import type { AnimalStatusCode } from "@/lib/types/animal";

const STATUS_MAP = {
  AVAILABLE: "Open for Adoption",
  PENDING: "Pending",
  ADOPTED: "Adopted",
  IN_TREATMENT: "In Care",
  DECEASED: "Archived",
} as const satisfies Record<AnimalStatusCode, string>;

export type AnimalStatusLabel = (typeof STATUS_MAP)[AnimalStatusCode];

export function toStatusLabel(code: AnimalStatusCode): AnimalStatusLabel {
  return STATUS_MAP[code];
}

export const STATUS_CODES = Object.keys(STATUS_MAP) as AnimalStatusCode[];

export function isAnimalStatusCode(value: string): value is AnimalStatusCode {
  return STATUS_CODES.includes(value as AnimalStatusCode);
}
