import type { BffError } from "@/lib/types";

import { fetchAnimal } from "@/lib/api/animals";
import { serviceUrl } from "@/lib/api/client";

interface BackendAdopterDto {
  id: string;
  name: string;
  telephone: string;
  email: string;
  address?: string | null;
  status: string;
  preferences: Record<string, unknown> | null;
  interestedAnimals: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendAdoptionHistoryDto {
  id: string;
  animalId: string;
  adoptionDate?: string | null;
  returnDate?: string | null;
  notes?: string | null;
}

interface BackendEmployeeDto {
  id: string;
  name: string;
  email: string;
  telephone?: string | null;
  role: "STAFF" | "ADMIN";
  createdAt?: string;
  updatedAt?: string;
}

interface BackendAuthResponse {
  user?: {
    accountId?: string;
    profileId?: string;
    role?: "STAFF" | "ADMIN" | "ADOPTER";
  };
}

interface BackendValidationError {
  message?: string;
  errors?: Record<string, string[]>;
}

export interface AdminAdopterSummary {
  id: string;
  name: string;
  email: string;
  telephone: string;
  status: string;
  interestCount: number;
}

export interface AdminAdopterDetail extends AdminAdopterSummary {
  address?: string;
  preferences: Record<string, unknown>;
  history: AdminAdoptionHistoryEntry[];
}

export interface AdminAdoptionHistoryEntry {
  id: string;
  animalId: string;
  adoptionDate?: string;
  returnDate?: string;
  notes?: string;
  animalName?: string;
}

export interface AdminEmployeeSummary {
  id: string;
  name: string;
  email: string;
  telephone?: string;
  role: "STAFF" | "ADMIN";
}

export interface AdminEmployeeDetail extends AdminEmployeeSummary {
  createdAt?: string;
  updatedAt?: string;
}

export interface ProvisionStaffRequest {
  name: string;
  email: string;
  telephone?: string;
  password: string;
  role: "STAFF" | "ADMIN";
}

export interface UpdateAdopterRequest {
  name?: string;
  telephone?: string;
  email?: string;
  address?: string;
  status?: string;
  preferences?: Record<string, unknown>;
}

export interface UpdateStaffRequest {
  name?: string;
  email?: string;
  telephone?: string;
  role?: "STAFF" | "ADMIN";
}

export class AdminApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.body = body;
  }
}

export async function fetchAdminAdopters(): Promise<AdminAdopterSummary[]> {
  const response = await fetch(serviceUrl("ADOPTER", "/api/adopters"), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AdminApiError(
      `Failed to fetch adopters: ${response.status}`,
      response.status,
      await safeReadJson(response),
    );
  }

  return ((await response.json()) as BackendAdopterDto[]).map(mapAdminAdopterSummary);
}

export async function fetchAdminAdopterDetail(
  adopterId: string,
): Promise<AdminAdopterDetail> {
  const [profileResponse, historyResponse] = await Promise.all([
    fetch(serviceUrl("ADOPTER", `/api/adopters/${adopterId}`), { cache: "no-store" }),
    fetch(serviceUrl("ADOPTER", `/api/adopters/${adopterId}/history`), {
      cache: "no-store",
    }),
  ]);

  if (!profileResponse.ok) {
    throw new AdminApiError(
      `Failed to fetch adopter: ${profileResponse.status}`,
      profileResponse.status,
      await safeReadJson(profileResponse),
    );
  }

  if (!historyResponse.ok) {
    throw new AdminApiError(
      `Failed to fetch adoption history: ${historyResponse.status}`,
      historyResponse.status,
      await safeReadJson(historyResponse),
    );
  }

  const profile = (await profileResponse.json()) as BackendAdopterDto;
  const adopter = mapAdminAdopterSummary(profile);
  const history = await mapHistoryEntries(
    (await historyResponse.json()) as BackendAdoptionHistoryDto[],
  );

  return {
    ...adopter,
    ...(profile.address?.trim() ? { address: profile.address } : {}),
    preferences: normalizePreferences(profile.preferences),
    history,
  };
}

export async function fetchAdminEmployees(): Promise<AdminEmployeeSummary[]> {
  const response = await fetch(serviceUrl("USER", "/api/employees"), {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AdminApiError(
      `Failed to fetch employees: ${response.status}`,
      response.status,
      await safeReadJson(response),
    );
  }

  return ((await response.json()) as BackendEmployeeDto[]).map(mapAdminEmployee);
}

export async function fetchAdminEmployeeDetail(
  employeeId: string,
): Promise<AdminEmployeeDetail> {
  const response = await fetch(serviceUrl("USER", `/api/employees/${employeeId}`), {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AdminApiError(
      `Failed to fetch employee: ${response.status}`,
      response.status,
      await safeReadJson(response),
    );
  }

  return mapAdminEmployee((await response.json()) as BackendEmployeeDto);
}

export async function provisionStaff(
  body: ProvisionStaffRequest,
): Promise<Pick<AdminEmployeeSummary, "role"> & { accountId?: string; profileId?: string }> {
  const path = body.role === "ADMIN" ? "/api/auth/provision/admin" : "/api/auth/provision/staff";
  const response = await fetch(serviceUrl("USER", path), {
    credentials: "same-origin",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new AdminApiError(
      `Failed to provision staff account: ${response.status}`,
      response.status,
      await safeReadJson(response),
    );
  }

  const payload = (await response.json()) as BackendAuthResponse;

  return {
    role: body.role,
    ...(payload.user?.accountId ? { accountId: payload.user.accountId } : {}),
    ...(payload.user?.profileId ? { profileId: payload.user.profileId } : {}),
  };
}

export async function updateAdopter(
  adopterId: string,
  body: UpdateAdopterRequest,
): Promise<AdminAdopterDetail> {
  const response = await fetch(serviceUrl("ADOPTER", `/api/adopters/${adopterId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new AdminApiError(
      `Failed to update adopter: ${response.status}`,
      response.status,
      await safeReadJson(response),
    );
  }
  return mapAdminAdopterDetail(await response.json());
}

export async function updateStaff(
  employeeId: string,
  body: UpdateStaffRequest,
): Promise<AdminEmployeeDetail> {
  const response = await fetch(serviceUrl("USER", `/api/employees/${employeeId}`), {
    credentials: "same-origin",
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new AdminApiError(
      `Failed to update employee: ${response.status}`,
      response.status,
      await safeReadJson(response),
    );
  }

  return mapAdminEmployee((await response.json()) as BackendEmployeeDto);
}

export async function deleteStaff(employeeId: string): Promise<void> {
  const response = await fetch(serviceUrl("USER", `/api/employees/${employeeId}`), {
    credentials: "same-origin",
    method: "DELETE",
  });

  if (!response.ok) {
    throw new AdminApiError(
      `Failed to delete employee: ${response.status}`,
      response.status,
      await safeReadJson(response),
    );
  }
}

export function readAdminFieldErrors(
  error: AdminApiError,
): Record<string, string[]> | undefined {
  const body = error.body as BackendValidationError | null;

  if (!body || typeof body !== "object" || !body.errors || typeof body.errors !== "object") {
    return undefined;
  }

  return Object.entries(body.errors).reduce<Record<string, string[]>>((output, [key, value]) => {
    if (!Array.isArray(value)) {
      return output;
    }

    const messages = value.filter((entry): entry is string => typeof entry === "string");

    if (messages.length > 0) {
      output[key] = messages;
    }

    return output;
  }, {});
}

export function toAdminBffError(error: unknown, fallbackMessage: string): BffError {
  if (!(error instanceof AdminApiError)) {
    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: fallbackMessage,
    };
  }

  if (error.status === 404) {
    return {
      status: 404,
      code: "NOT_FOUND",
      message: "The requested admin record could not be found.",
    };
  }

  if (error.status === 400 || error.status === 422) {
    return {
      status: 422,
      code: "VALIDATION_ERROR",
      message: fallbackMessage,
      fieldErrors: readAdminFieldErrors(error),
    };
  }

  if (error.status >= 500) {
    return {
      status: 502,
      code: "UPSTREAM_ERROR",
      message: fallbackMessage,
    };
  }

  return {
    status: error.status,
    code: "ADMIN_REQUEST_FAILED",
    message: fallbackMessage,
  };
}

function mapAdminAdopterSummary(input: BackendAdopterDto): AdminAdopterSummary {
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    telephone: input.telephone,
    status: input.status,
    interestCount: Array.isArray(input.interestedAnimals) ? input.interestedAnimals.length : 0,
  };
}

function mapAdminAdopterDetail(input: BackendAdopterDto): AdminAdopterDetail {
  const summary = mapAdminAdopterSummary(input);
  return {
    ...summary,
    ...(input.address?.trim() ? { address: input.address } : {}),
    preferences: normalizePreferences(input.preferences),
    history: [],
  };
}

function mapAdminEmployee(input: BackendEmployeeDto): AdminEmployeeDetail {
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    ...(input.telephone?.trim() ? { telephone: input.telephone } : {}),
    role: input.role,
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    ...(input.updatedAt ? { updatedAt: input.updatedAt } : {}),
  };
}

function normalizePreferences(
  input: Record<string, unknown> | null,
): Record<string, unknown> {
  return input && typeof input === "object" ? input : {};
}

async function mapHistoryEntries(
  entries: BackendAdoptionHistoryDto[],
): Promise<AdminAdoptionHistoryEntry[]> {
  return Promise.all(
    entries.map(async (entry) => {
      let animalName: string | undefined;

      try {
        const animal = await fetchAnimal(entry.animalId);
        animalName = animal.name;
      } catch {
        animalName = undefined;
      }

      return {
        id: entry.id,
        animalId: entry.animalId,
        ...(entry.adoptionDate ? { adoptionDate: entry.adoptionDate } : {}),
        ...(entry.returnDate ? { returnDate: entry.returnDate } : {}),
        ...(entry.notes?.trim() ? { notes: entry.notes } : {}),
        ...(animalName ? { animalName } : {}),
      };
    }),
  );
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
