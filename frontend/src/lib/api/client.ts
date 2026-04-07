import type { BffError } from "@/lib/types";
import { SERVICES } from "@/lib/constants/config";

export function serviceUrl(service: keyof typeof SERVICES, path: string): string {
  return `${SERVICES[service]}${path}`;
}

export function bffError(status: number, code: string, message: string, fieldErrors?: Record<string, string[]>): BffError {
  return { status, code, message, fieldErrors };
}

export function jsonResponse<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function errorResponse(error: BffError): Response {
  return Response.json(error, { status: error.status });
}
