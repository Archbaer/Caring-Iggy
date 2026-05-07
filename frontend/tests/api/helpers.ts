import { expect, APIRequestContext } from "@playwright/test";
import { TEST_CREDENTIALS } from "./fixtures";

/**
 * Get a fresh CSRF token from the session endpoint.
 * Also sets the ci_csrf cookie in the request context.
 */
export async function getCsrfToken(request: APIRequestContext): Promise<string> {
  const resp = await request.get("/api/auth/session");
  expect(resp.ok()).toBeTruthy();
  const { csrfToken } = await resp.json();
  expect(csrfToken).toBeTruthy();
  return csrfToken;
}

/**
 * Login as a specific role and return fresh CSRF token.
 * Use this when you need to be authenticated for subsequent requests.
 */
export async function loginAs(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<void> {
  const csrfToken = await getCsrfToken(request);
  const loginResp = await request.post("/api/auth/login", {
    data: { email, password },
    headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
  });
  expect(loginResp.ok()).toBeTruthy();
}

/**
 * Login as admin (testadmin@caringiggy.test)
 */
export async function loginAsAdmin(request: APIRequestContext): Promise<void> {
  await loginAs(request, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
}

/**
 * Login as staff (teststaff@caringiggy.test)
 */
export async function loginAsStaff(request: APIRequestContext): Promise<void> {
  await loginAs(request, TEST_CREDENTIALS.staff.email, TEST_CREDENTIALS.staff.password);
}

/**
 * Login as adopter (testadopter@caringiggy.test)
 */
export async function loginAsAdopter(request: APIRequestContext): Promise<void> {
  await loginAs(request, TEST_CREDENTIALS.adopter.email, TEST_CREDENTIALS.adopter.password);
}

/**
 * Create an animal via API. Requires already logged in as staff.
 */
export async function createAnimal(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {},
) {
  const csrfToken = await getCsrfToken(request);
  const resp = await request.post("/api/animals/create", {
    data: {
      name: `Test Animal ${Date.now()}`,
      animalType: "Dog",
      breed: "Test Breed",
      status: "AVAILABLE",
      ...overrides,
    },
    headers: { "x-csrf-token": csrfToken, origin: "http://localhost:3000" },
  });
  return resp;
}

/**
 * Animal response shape matcher for toMatchObject.
 */
export const ANIMAL_DETAIL_SHAPE = {
  id: expect.any(String),
  name: expect.any(String),
  animalType: expect.any(String),
  breed: expect.any(String),
  status: expect.any(String),
};

/**
 * Staff summary shape matcher.
 */
export const STAFF_SUMMARY_SHAPE = {
  id: expect.any(String),
  name: expect.any(String),
  email: expect.any(String),
  role: expect.any(String),
};

/**
 * Error response shape matcher.
 */
export const ERROR_SHAPE = {
  code: expect.any(String),
  message: expect.any(String),
};

/**
 * Non-existent sentinel UUID for 404 tests.
 */
export const NON_EXISTENT_ID = "00000000-0000-0000-0000-000000000000";
