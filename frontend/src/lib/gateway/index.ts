import { headers } from "next/headers";

import { resolveClientIp } from "./client-ip";
import { createKongClient } from "./kong-client";
import { createTokenExchanger, type ExchangeResult } from "./token-exchange";

export const KONG_URL = process.env.KONG_URL ?? "http://localhost:8000";

async function exchangeToken(sessionToken: string): Promise<ExchangeResult> {
  const response = await fetch(`${KONG_URL}/internal/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed with status ${response.status}`);
  }

  return (await response.json()) as ExchangeResult;
}

const tokenExchanger = createTokenExchanger(exchangeToken);

export class GatewayAuthError extends Error {
  constructor(message = "A session is required to call the gateway.") {
    super(message);
    this.name = "GatewayAuthError";
  }
}

export interface GatewayFetchOptions extends RequestInit {
  session?: string | null;
  public?: boolean;
  clientIp?: string;
}

export async function gatewayFetch(
  path: string,
  options: GatewayFetchOptions = {},
): Promise<Response> {
  const { session, public: isPublic, clientIp, ...init } = options;

  if (!isPublic && !session) {
    throw new GatewayAuthError();
  }

  const resolvedClientIp = clientIp ?? resolveClientIp(await headers());

  const client = createKongClient({
    baseUrl: KONG_URL,
    getToken: () => tokenExchanger.getToken(session as string),
  });

  return client.call(path, {
    ...init,
    clientIp: resolvedClientIp,
    public: isPublic,
  });
}
