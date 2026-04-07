import type {
  AnimalSummary,
  AnimalDetail,
  AnimalListParams,
  AnimalStatusLabel,
} from "@/lib/types";
import { toStatusLabel } from "@/lib/constants/status-map";
import { serviceUrl } from "./client";

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
  if (!res.ok) throw new Error(`Failed to fetch animals: ${res.status}`);
  return res.json();
}

export async function fetchAnimal(id: string): Promise<AnimalDetail> {
  const res = await fetch(serviceUrl("ANIMAL", `/api/animals/${id}`), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch animal: ${res.status}`);
  return res.json();
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
