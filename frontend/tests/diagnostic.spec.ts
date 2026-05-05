import { test, expect } from "@playwright/test";

test.describe("API Diagnostic", () => {
  test("diagnose 401/404/422 errors step by step", async ({ page, request }) => {
    // Step 1: Try to access admin page (should redirect to login if not authenticated)
    console.log("=== STEP 1: Access admin staff page ===");
    const staffListResponse = await page.goto("http://localhost:3000/dashboard/admin/staff");
    console.log("Staff list status:", staffListResponse?.status());
    console.log("Staff list URL:", page.url());

    // If redirected to login, we need to log in
    if (page.url().includes("/login")) {
      console.log("=== Redirected to login. Attempting login ===");
      // Fill login form - check what fields exist
      const emailInput = page.locator('input[type="email"], input[name="email"], input#email');
      const passwordInput = page.locator('input[type="password"], input[name="password"], input#password');
      
      console.log("Email input count:", await emailInput.count());
      console.log("Password input count:", await passwordInput.count());
      
      // Get page HTML to see form structure
      const formHtml = await page.locator("form").first().innerHTML();
      console.log("Form HTML (first 500 chars):", formHtml.substring(0, 500));
    }

    // Step 2: Check session state via API
    console.log("\n=== STEP 2: Check session ===");
    const sessionResponse = await request.get("http://localhost:3000/api/auth/session");
    console.log("Session status:", sessionResponse.status());
    const sessionBody = await sessionResponse.json();
    console.log("Session body:", JSON.stringify(sessionBody, null, 2));

    // Step 3: Try admin staff list API
    console.log("\n=== STEP 3: Staff list API ===");
    const staffApiResponse = await request.get("http://localhost:3000/api/admin/staff");
    console.log("Staff API status:", staffApiResponse.status());
    if (staffApiResponse.status() !== 200) {
      const errBody = await staffApiResponse.json().catch(() => null);
      console.log("Staff API error:", JSON.stringify(errBody));
    } else {
      const staffList = await staffApiResponse.json();
      console.log("Staff count:", Array.isArray(staffList) ? staffList.length : "not an array");
      if (Array.isArray(staffList) && staffList.length > 0) {
        console.log("First staff member:", JSON.stringify(staffList[0]));
      }
    }

    // Step 4: Try adopter list API
    console.log("\n=== STEP 4: Adopter list API ===");
    const adopterApiResponse = await request.get("http://localhost:3000/api/admin/adopters");
    console.log("Adopter API status:", adopterApiResponse.status());
    if (adopterApiResponse.status() !== 200) {
      const errBody = await adopterApiResponse.json().catch(() => null);
      console.log("Adopter API error:", JSON.stringify(errBody));
    } else {
      const adopterList = await adopterApiResponse.json();
      console.log("Adopter count:", Array.isArray(adopterList) ? adopterList.length : "not an array");
      if (Array.isArray(adopterList) && adopterList.length > 0) {
        console.log("First adopter:", JSON.stringify(adopterList[0]));
      }
    }

    // Step 5: Try animal create API (POST without auth)
    console.log("\n=== STEP 5: Animal create API (no body) ===");
    const createResponse = await request.post("http://localhost:3000/api/animals/create", {
      headers: { "Content-Type": "application/json" },
      data: { name: "" },
    });
    console.log("Create status:", createResponse.status());
    const createBody = await createResponse.json().catch(() => null);
    console.log("Create body:", JSON.stringify(createBody));
  });
});
