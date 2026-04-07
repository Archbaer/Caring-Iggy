/**
 * Server-only service configuration.
 * These values MUST NOT be imported into client components.
 * All microservice communication happens through BFF route handlers.
 */

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env variable: ${key}`);
  }
  return value;
}

export const SERVICES = {
  get ANIMAL() {
    return requiredEnv("ANIMAL_SERVICE_URL");
  },
  get USER() {
    return requiredEnv("USER_SERVICE_URL");
  },
  get ADOPTER() {
    return requiredEnv("ADOPTER_SERVICE_URL");
  },
} as const;

export const INTERNAL_BASE_URL =
  process.env.INTERNAL_BASE_URL ?? "http://localhost:3000";
