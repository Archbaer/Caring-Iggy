import type { AdopterProfile, UpdatePreferencesRequest, AddInterestRequest } from "@/lib/types";
import { serviceUrl } from "./client";

export async function fetchAdopterProfile(adopterId: string): Promise<AdopterProfile> {
  const res = await fetch(serviceUrl("ADOPTER", `/api/adopters/${adopterId}`));
  if (!res.ok) throw new Error(`Failed to fetch adopter profile: ${res.status}`);
  return res.json();
}

export async function updateAdopterPreferences(
  adopterId: string,
  body: UpdatePreferencesRequest,
): Promise<AdopterProfile> {
  const res = await fetch(serviceUrl("ADOPTER", `/api/adopters/${adopterId}/preferences`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to update preferences: ${res.status}`);
  return res.json();
}

export async function addAdopterInterest(
  adopterId: string,
  body: AddInterestRequest,
): Promise<AdopterProfile> {
  const res = await fetch(serviceUrl("ADOPTER", `/api/adopters/${adopterId}/interests`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to add interest: ${res.status}`);
  return res.json();
}
