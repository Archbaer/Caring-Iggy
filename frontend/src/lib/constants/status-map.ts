import type { AnimalStatusCode } from "@/lib/types/animal";

const STATUS_META = {
  AVAILABLE: {
    label: "Open for Adoption",
    interestSummary: "This animal is still open for adoption.",
  },
  PENDING: {
    label: "Pending",
    interestSummary: "This animal is currently pending with an active adoption workflow.",
  },
  ADOPTED: {
    label: "Adopted",
    interestSummary: "This animal has already been adopted.",
  },
  IN_TREATMENT: {
    label: "In Care",
    interestSummary: "This animal is still in care before adoption can move forward.",
  },
  DECEASED: {
    label: "Archived",
    interestSummary: "This profile is archived and no longer active for adoption.",
  },
} as const satisfies Record<
  AnimalStatusCode,
  { label: string; interestSummary: string }
>;

export type AnimalStatusLabel = (typeof STATUS_META)[AnimalStatusCode]["label"];

export function toStatusLabel(code: AnimalStatusCode): AnimalStatusLabel {
  return STATUS_META[code].label;
}

export function toInterestStatusSummary(code: AnimalStatusCode): string {
  return STATUS_META[code].interestSummary;
}

export const STATUS_CODES = Object.keys(STATUS_META) as AnimalStatusCode[];

export function isAnimalStatusCode(value: string): value is AnimalStatusCode {
  return STATUS_CODES.includes(value as AnimalStatusCode);
}
