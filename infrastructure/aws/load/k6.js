import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 300 },
    { duration: "10m", target: 300 },
    { duration: "1m", target: 700 },
    { duration: "2m", target: 700 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    "http_req_failed{phase:load}": ["rate<0.01"],
    "checks{phase:load}": ["rate>0.99"],
    "http_req_duration{phase:load}": ["p(95)<2000", "p(99)<5000"],
  },
};
const baseUrl = __ENV.BASE_URL.replace(/\/$/, "");
const fixtures = JSON.parse(open(__ENV.K6_FIXTURE_FILE));
if (!fixtures.animalIds || fixtures.animalIds.length !== 3) throw new Error("Three fixture animals are required");

function params(session, phase = "load") {
  // Explicit jars keep public/adopter/staff traffic separate, including setup.
  const jar = new http.CookieJar();
  for (const [name, value] of Object.entries(session?.cookies || {})) jar.set(baseUrl, name, value);
  return {
    jar, redirects: 0, tags: { phase },
    headers: { "Content-Type": "application/json", Origin: baseUrl, "x-csrf-token": session?.csrfToken || "" },
  };
}
function cookies(response) {
  const result = {};
  for (const [name, values] of Object.entries(response.cookies)) result[name] = values[0].value;
  return result;
}
function login(credentials) {
  const initial = http.get(`${baseUrl}/api/auth/session`, params(null, "setup"));
  if (initial.status !== 200) throw new Error("Session setup failed");
  const session = { cookies: cookies(initial), csrfToken: initial.json().csrfToken };
  const response = http.post(`${baseUrl}/api/auth/login`, JSON.stringify(credentials), params(session, "setup"));
  if (response.status !== 200 || !response.cookies.ci_session || !response.cookies.ci_session_state) throw new Error("Fixture login failed");
  return { cookies: cookies(response), csrfToken: response.json().csrfToken };
}
export function setup() {
  return { adopter: login({ email: fixtures.adopter.email, password: fixtures.adopter.password }),
    staff: login({ email: fixtures.staff.email, password: fixtures.staff.password }), animalIds: fixtures.animalIds };
}
function checked(response, label) {
  check(response, { [label]: r => r.status === 200 }, { phase: "load" });
}
export default function (data) {
  const group = Math.random();
  const id = data.animalIds[Math.floor(Math.random() * data.animalIds.length)];
  if (group < 0.6) {
    checked(http.get(`${baseUrl}/animals`, params()), "public animal list");
    checked(http.get(`${baseUrl}/animals/${id}`, params()), "public animal detail");
  } else if (group < 0.8) {
    checked(http.get(`${baseUrl}/dashboard`, params(data.adopter)), "adopter dashboard");
  } else if (group < 0.9) {
    checked(http.put(`${baseUrl}/api/adopter/interests`, JSON.stringify({ interestedAnimalIds: [id] }), params(data.adopter)), "adopter interest write");
  } else {
    checked(http.get(`${baseUrl}/dashboard`, params(data.staff)), "staff dashboard");
    checked(http.put(`${baseUrl}/api/animals/${id}/edit`, JSON.stringify({ temperament: "Friendly" }), params(data.staff)), "staff animal write");
  }
  sleep(1);
}
