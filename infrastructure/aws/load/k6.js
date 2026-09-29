import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 300 },
    { duration: "10m", target: 300 },
    { duration: "1m", target: 0 },
    { duration: "1m", target: 700 },
    { duration: "2m", target: 700 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
  },
};

const baseUrl = (__ENV.BASE_URL || "https://localhost").replace(/\/$/, "");
const fixtureFile = __ENV.K6_FIXTURE_FILE || "";

function loadFixtures() {
  if (!fixtureFile) {
    throw new Error("K6_FIXTURE_FILE environment variable is required");
  }
  return JSON.parse(open(fixtureFile));
}

const fixtures = loadFixtures();

function post(path, body, extraHeaders, cookies) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extraHeaders,
  };
  const params = { headers };
  if (cookies) {
    params.cookies = cookies;
  }
  return http.post(`${baseUrl}${path}`, JSON.stringify(body), params);
}

function put(path, body, extraHeaders, cookies) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extraHeaders,
  };
  const params = { headers };
  if (cookies) {
    params.cookies = cookies;
  }
  return http.put(`${baseUrl}${path}`, JSON.stringify(body), params);
}

function get(path, extraHeaders, cookies) {
  const headers = {
    Accept: "application/json",
    ...extraHeaders,
  };
  const params = { headers };
  if (cookies) {
    params.cookies = cookies;
  }
  return http.get(`${baseUrl}${path}`, params);
}

function pageGet(path, cookies) {
  const params = {};
  if (cookies) {
    params.cookies = cookies;
  }
  return http.get(`${baseUrl}${path}`, params);
}

function extractCookies(response) {
  const cookies = {};
  const setCookie = response.headers["Set-Cookie"];
  if (!setCookie) {
    return cookies;
  }
  const values = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const value of values) {
    const pair = value.split(";")[0].trim();
    const eq = pair.indexOf("=");
    if (eq > 0) {
      cookies[pair.slice(0, eq)] = pair.slice(eq + 1);
    }
  }
  return cookies;
}

function sessionCookies(cookieJar) {
  return {
    ci_session: cookieJar["ci_session"] || "",
    ci_session_state: cookieJar["ci_session_state"] || "",
  };
}

function login(email, password) {
  const sessionRes = get("/api/auth/session");
  const sessionBody = sessionRes.json();
  const csrfToken = sessionBody && sessionBody.csrfToken ? sessionBody.csrfToken : "";
  const csrfCookie = extractCookies(sessionRes)["ci_csrf"] || "";

  const loginRes = post(
    "/api/auth/login",
    { email, password },
    { "x-csrf-token": csrfToken },
    { ci_csrf: csrfCookie },
  );

  const loginBody = loginRes.json();
  const authCookies = extractCookies(loginRes);
  return {
    cookies: {
      ci_session: authCookies["ci_session"] || "",
      ci_session_state: authCookies["ci_session_state"] || "",
    },
    csrfToken: loginBody && loginBody.csrfToken ? loginBody.csrfToken : "",
    csrfCookie: authCookies["ci_csrf"] || "",
  };
}

export function setup() {
  const adopter = login(fixtures.adopter.email, fixtures.adopter.password);
  const staff = login(fixtures.staff.email, fixtures.staff.password);
  return {
    adopter,
    staff,
    animalIds: fixtures.animalIds || [],
  };
}

function randomAnimalId(ids) {
  if (!ids || ids.length === 0) {
    return "00000000-0000-0000-0000-000000000000";
  }
  return ids[Math.floor(Math.random() * ids.length)];
}

const mixWeights = {
  public: 0.6,
  adopter: 0.2,
  interest: 0.1,
  staff: 0.1,
};

function selectGroup() {
  const r = Math.random();
  if (r < mixWeights.public) return "public";
  if (r < mixWeights.public + mixWeights.adopter) return "adopter";
  if (r < mixWeights.public + mixWeights.adopter + mixWeights.interest) return "interest";
  return "staff";
}

function publicReads(data) {
  const listRes = pageGet("/animals");
  check(listRes, {
    "public animal list is 200": (r) => r.status === 200,
  });

  const id = randomAnimalId(data.animalIds);
  const detailRes = pageGet(`/animals/${id}`);
  check(detailRes, {
    "public animal detail is 200": (r) => r.status === 200,
  });
}

function adopterReads(data) {
  const res = get("/api/auth/session", {}, data.adopter.cookies);
  check(res, {
    "adopter session read is 200": (r) => r.status === 200,
  });
}

function interestWrite(data) {
  const id = randomAnimalId(data.animalIds);
  const res = put(
    "/api/adopter/interests",
    { interestedAnimalIds: [id] },
    { "x-csrf-token": data.adopter.csrfToken },
    { ...data.adopter.cookies, ci_csrf: data.adopter.csrfCookie },
  );
  check(res, {
    "adopter interest write is 200": (r) => r.status === 200,
  });
}

function staffAdminRequests(data) {
  const r = Math.random();
  if (r < 0.5) {
    const listRes = get("/api/admin/staff", {}, data.staff.cookies);
    check(listRes, {
      "staff list read is 200": (r2) => r2.status === 200,
    });
  } else {
    const id = randomAnimalId(data.animalIds);
    const detailRes = pageGet(`/animals/${id}`, data.staff.cookies);
    check(detailRes, {
      "staff animal detail read is 200": (r2) => r2.status === 200,
    });
  }
}

export default function (data) {
  const group = selectGroup();
  switch (group) {
    case "public":
      publicReads(data);
      break;
    case "adopter":
      adopterReads(data);
      break;
    case "interest":
      interestWrite(data);
      break;
    case "staff":
      staffAdminRequests(data);
      break;
  }
  sleep(1);
}
