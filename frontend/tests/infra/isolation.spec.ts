import { test, expect } from "@playwright/test";
import net from "node:net";

function portClosed(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    sock.setTimeout(1500);
    sock.on("connect", () => { sock.destroy(); resolve(false); }); // open => not isolated
    sock.on("error", () => resolve(true));   // refused => isolated
    sock.on("timeout", () => { sock.destroy(); resolve(true); });
  });
}

for (const port of [8081, 8082, 8083, 8084, 8085]) {
  test(`backend port ${port} is NOT reachable from host`, async () => {
    expect(await portClosed("localhost", port)).toBe(true);
  });
}

test("kong proxy port 8000 IS reachable", async () => {
  expect(await portClosed("localhost", 8000)).toBe(false);
});
