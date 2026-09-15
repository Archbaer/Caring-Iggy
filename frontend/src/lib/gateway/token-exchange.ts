export interface ExchangeResult {
  token: string;
  expiresAtEpochSeconds: number;
}

export type Fetcher = (sessionToken: string) => Promise<ExchangeResult>;
export type Clock = () => number;

const SAFETY_SKEW_SECONDS = 5;

export function createTokenExchanger(fetcher: Fetcher, clock: Clock = () => Math.floor(Date.now() / 1000)) {
  const cache = new Map<string, ExchangeResult>();

  async function getToken(sessionToken: string): Promise<string> {
    const cached = cache.get(sessionToken);
    if (cached && cached.expiresAtEpochSeconds - SAFETY_SKEW_SECONDS > clock()) {
      return cached.token;
    }
    const fresh = await fetcher(sessionToken);
    cache.set(sessionToken, fresh);
    return fresh.token;
  }

  return { getToken };
}
