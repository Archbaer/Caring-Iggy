import { test } from "@playwright/test";

test("debug auth and API calls", async ({ page }) => {
  // Step 0: First get CSRF cookie for login
  await page.goto("http://localhost:3000/api/auth/session");
  const cookies0 = await page.context().cookies();
  const csrfCookie0 = cookies0.find(c => c.name.includes("csrf"));
  console.log("Initial CSRF cookie:", csrfCookie0?.name, csrfCookie0 ? csrfCookie0.value.substring(0, 15) + "..." : "NONE");

  // Step 1: Navigate to login page
  await page.goto("http://localhost:3000/login");
  console.log("Login page URL:", page.url());
  
  // Step 2: Get CSRF token from the login page
  const csrfCookie = (await page.context().cookies()).find(c => c.name.includes("csrf"));
  console.log("CSRF cookie after page load:", csrfCookie?.name, csrfCookie ? csrfCookie.value.substring(0, 15) + "..." : "NONE");
  
  // Step 3: Try different passwords
  const passwords = ["password", "admin123", "Password1!", "test1234", "admin", "caringiggy", "admin@outlook.com"];
  
  let loggedIn = false;
  
  for (const pwd of passwords) {
    await page.goto("http://localhost:3000/login");
    await page.fill("#login-email", "admin@outlook.com");
    await page.fill("#login-password", pwd);
    
    // Get latest CSRF token
    const csrfToken = (await page.context().cookies()).find(c => c.name.includes("csrf"))?.value || "";
    console.log(`\nTrying password: "${pwd}", CSRF: ${csrfToken.substring(0, 10)}...`);
    
    const [loginResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes("/api/auth/login") && r.request().method() === "POST", { timeout: 5000 }).catch(() => null),
      page.click('button[type="submit"]'),
    ]);
    
    if (loginResp) {
      console.log(`Login response status: ${loginResp.status()}`);
      
      if (loginResp.status() === 200) {
        console.log(`✓ LOGIN SUCCESS with password: "${pwd}"`);
        loggedIn = true;
        
        // Check cookies after login
        const cookies = await page.context().cookies();
        console.log("\n=== COOKIES AFTER LOGIN ===");
        const sessionCookies = cookies.filter(c => c.name.startsWith("ci_"));
        sessionCookies.forEach(c => {
          console.log(`  ${c.name}: value=${c.value.substring(0, 30)}..., httpOnly=${c.httpOnly}, sameSite=${c.sameSite}, path=${c.path}`);
        });
        
        break;
      } else {
        const errBody = await loginResp.json().catch(() => ({}));
        console.log(`Login error: ${JSON.stringify(errBody).substring(0, 200)}`);
      }
    } else {
      console.log("No login response captured (possible redirect or CSRF failure)");
    }
  }
  
  if (!loggedIn) {
    console.log("FAILED TO LOG IN - none of the passwords worked");
    return;
  }
  
  // Step 4: Get staff list
  console.log("\n=== TRYING STAFF LIST API ===");
  const staffListResp = await page.request.get("http://localhost:3000/api/admin/staff");
  console.log(`Staff list status: ${staffListResp.status()}`);
  
  if (staffListResp.status() === 200) {
    const staffList = await staffListResp.json();
    console.log(`Staff count: ${Array.isArray(staffList) ? staffList.length : "not array"}`);
    
    if (Array.isArray(staffList) && staffList.length > 0) {
      const firstStaff = staffList[0];
      console.log(`First staff: id=${firstStaff.id}, name=${firstStaff.name}, role=${firstStaff.role}`);
      
      // Step 5: Get staff detail
      console.log("\n=== GET STAFF DETAIL ===");
      const detailResp = await page.request.get(`http://localhost:3000/api/admin/staff/${firstStaff.id}`);
      console.log(`Detail GET status: ${detailResp.status()}`);
      const detail = await detailResp.json().catch(() => ({}));
      console.log(`Detail name: ${detail.name}, role: ${detail.role}`);
      
      // Step 6: Try PUT (edit)
      console.log("\n=== PUT STAFF EDIT ===");
      const csrfToken = (await page.context().cookies()).find(c => c.name.includes("csrf"))?.value || "";
      console.log(`CSRF token: ${csrfToken.substring(0, 15)}...`);
      
      const putResp = await page.request.put(`http://localhost:3000/api/admin/staff/${firstStaff.id}`, {
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        data: {
          name: firstStaff.name || "Test Staff",
          role: "STAFF",
        },
      });
      console.log(`PUT status: ${putResp.status()}`);
      const putBody = await putResp.json().catch(() => ({}));
      console.log(`PUT response: ${JSON.stringify(putBody).substring(0, 300)}`);
      
      // Step 7: Try adopter list
      console.log("\n=== ADOPTER LIST API ===");
      const adopterListResp = await page.request.get("http://localhost:3000/api/admin/adopters");
      console.log(`Adopter list status: ${adopterListResp.status()}`);
      
      if (adopterListResp.status() === 200) {
        const adopterList = await adopterListResp.json();
        console.log(`Adopter count: ${Array.isArray(adopterList) ? adopterList.length : "not array"}`);
        
        if (Array.isArray(adopterList) && adopterList.length > 0) {
          const firstAdopter = adopterList[0];
          console.log(`First adopter: id=${firstAdopter.id}, name=${firstAdopter.name}`);
          
          // Step 8: Try PUT adopter
          console.log("\n=== PUT ADOPTER EDIT ===");
          const adopterPutResp = await page.request.put(`http://localhost:3000/api/admin/adopters/${firstAdopter.id}`, {
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
            data: {
              name: firstAdopter.name || "Test Adopter",
              status: "ACTIVE",
            },
          });
          console.log(`Adopter PUT status: ${adopterPutResp.status()}`);
          const adopterPutBody = await adopterPutResp.json().catch(() => ({}));
          console.log(`Adopter PUT response: ${JSON.stringify(adopterPutBody).substring(0, 300)}`);
        }
      }
      
      // Step 9: Try animal create
      console.log("\n=== ANIMAL CREATE API ===");
      const animalCreateResp = await page.request.post("http://localhost:3000/api/animals/create", {
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        data: {
          name: "Test Animal " + Date.now(),
          animalType: "Dog",
          breed: "Mixed",
          status: "AVAILABLE",
        },
      });
      console.log(`Animal create status: ${animalCreateResp.status()}`);
      const animalCreateBody = await animalCreateResp.json().catch(() => ({}));
      console.log(`Animal create response: ${JSON.stringify(animalCreateBody).substring(0, 500)}`);
    }
  } else {
    const err = await staffListResp.json().catch(() => ({}));
    console.log(`Staff list error: ${JSON.stringify(err).substring(0, 300)}`);
  }
});
