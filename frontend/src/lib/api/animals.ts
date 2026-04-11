import type {
  AnimalCreateRequest,
  AnimalSummary,
  AnimalDetail,
  AnimalListParams,
  AnimalStatusLabel,
  AnimalUpdateRequest,
  PreviousOwner,
} from "@/lib/types";
import { toStatusLabel } from "@/lib/constants/status-map";
import { serviceUrl } from "./client";

interface BackendPreviousOwnerDto {
  id?: string;
  name?: string;
  telephone?: string;
  email?: string | null;
  address?: string | null;
}

interface BackendAnimalDetailDto {
  id: string;
  name: string;
  dateOfBirth?: string | null;
  animalType: string;
  breed: string;
  gender?: "MALE" | "FEMALE" | "UNKNOWN" | null;
  size?: "SMALL" | "MEDIUM" | "LARGE" | null;
  temperament?: string | null;
  status: AnimalSummary["status"];
  intakeDate?: string | null;
  description?: string | null;
  imageUrl: string | null;
  previousOwner?: BackendPreviousOwnerDto | null;
}

export class AnimalServiceError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "AnimalServiceError";
    this.status = status;
    this.body = body;
  }
}

export type AnimalSummaryView = AnimalSummary & {
  statusLabel: AnimalStatusLabel;
};

export type AnimalDetailView = AnimalDetail & {
  statusLabel: AnimalStatusLabel;
};

export async function fetchAnimals(params?: AnimalListParams): Promise<AnimalSummary[]> {
  const url = new URL(serviceUrl("ANIMAL", "/api/animals"));
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.type) url.searchParams.set("type", params.type);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new AnimalServiceError(
      `Failed to fetch animals: ${res.status}`,
      res.status,
      await safeReadJson(res),
    );
  }
  return res.json();
}

export async function fetchAnimal(id: string): Promise<AnimalDetail> {
  const res = await fetch(serviceUrl("ANIMAL", `/api/animals/${id}`), {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new AnimalServiceError(
      `Failed to fetch animal: ${res.status}`,
      res.status,
      await safeReadJson(res),
    );
  }

  return mapAnimalDetail((await res.json()) as BackendAnimalDetailDto);
}

export async function fetchAnimalsForView(
  params?: AnimalListParams,
): Promise<AnimalSummaryView[]> {
  const animals = await fetchAnimals(params);

  return animals.map((animal) => ({
    ...animal,
    statusLabel: toStatusLabel(animal.status),
  }));
}

export async function fetchAnimalForView(id: string): Promise<AnimalDetailView> {
  const animal = await fetchAnimal(id);

  return {
    ...animal,
    statusLabel: toStatusLabel(animal.status),
  };
}

export async function createAnimal(body: AnimalCreateRequest): Promise<AnimalDetail> {
  const response = await fetch(serviceUrl("ANIMAL", "/api/animals"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new AnimalServiceError(
      `Failed to create animal: ${response.status}`,
      response.status,
      await safeReadJson(response),
    );
  }

  return mapAnimalDetail((await response.json()) as BackendAnimalDetailDto);
}

export async function updateAnimal(
  id: string,
  body: AnimalUpdateRequest,
): Promise<AnimalDetail> {
  const response = await fetch(serviceUrl("ANIMAL", `/api/animals/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new AnimalServiceError(
      `Failed to update animal: ${response.status}`,
      response.status,
      await safeReadJson(response),
    );
  }

  return mapAnimalDetail((await response.json()) as BackendAnimalDetailDto);
}

export async function deleteAnimal(id: string): Promise<void> {
  const response = await fetch(serviceUrl("ANIMAL", `/api/animals/${id}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new AnimalServiceError(
      `Failed to delete animal: ${response.status}`,
      response.status,
      await safeReadJson(response),
    );
  }
}

function mapAnimalDetail(input: BackendAnimalDetailDto): AnimalDetail {
  return {
    id: input.id,
    name: input.name,
    animalType: input.animalType,
    breed: input.breed,
    status: input.status,
    imageUrl: input.imageUrl,
    ...(input.dateOfBirth ? { dateOfBirth: input.dateOfBirth } : {}),
    ...(input.description?.trim() ? { description: input.description } : {}),
    ...(input.gender ? { gender: input.gender } : {}),
    ...(input.size ? { size: input.size } : {}),
    ...(input.temperament?.trim() ? { temperament: input.temperament } : {}),
    ...(input.intakeDate ? { intakeDate: input.intakeDate } : {}),
    ...(mapPreviousOwner(input.previousOwner)
      ? { previousOwner: mapPreviousOwner(input.previousOwner) }
      : {}),
    ...(resolveAge(input.dateOfBirth) !== undefined
      ? { age: resolveAge(input.dateOfBirth) }
      : {}),
    ...(input.gender === "MALE" || input.gender === "FEMALE"
      ? { sex: input.gender }
      : {}),
  };
}

function mapPreviousOwner(
  input: BackendPreviousOwnerDto | null | undefined,
): PreviousOwner | undefined {
  if (!input?.id || !input.name || !input.telephone) {
    return undefined;
  }

  return {
    id: input.id,
    name: input.name,
    telephone: input.telephone,
    ...(input.email?.trim() ? { email: input.email } : {}),
    ...(input.address?.trim() ? { address: input.address } : {}),
  };
}

function resolveAge(dateOfBirth: string | null | undefined): number | undefined {
  if (!dateOfBirth) {
    return undefined;
  }

  const parsed = new Date(dateOfBirth);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const now = new Date();
  let age = now.getUTCFullYear() - parsed.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - parsed.getUTCMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < parsed.getUTCDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : undefined;
}

async function safeReadJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}
