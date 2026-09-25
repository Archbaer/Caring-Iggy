import type { BffError } from "@/lib/types";

export function bffError(status: number, code: string, message: string, fieldErrors?: Record<string, string | string[]>): BffError {
  return { status, code, message, fieldErrors };
}

export function jsonResponse<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function errorResponse(error: BffError): Response {
  return Response.json(error, { status: error.status });
}

export async function safeReadJson(response: Response): Promise<unknown> {
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
