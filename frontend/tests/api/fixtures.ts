/**
 * Test credentials for E2E testing.
 * These accounts exist in the database via V5__test_accounts.sql migration.
 */
export const TEST_CREDENTIALS = {
  admin: {
    email: "testadmin@caringiggy.test",
    password: "password123",
  },
  staff: {
    email: "teststaff@caringiggy.test",
    password: "password123",
  },
  adopter: {
    email: "testadopter@caringiggy.test",
    password: "password123",
  },
} as const;
