export interface KongClientOptions {
  baseUrl: string;
  getToken: () => Promise<string>;
  fetchImpl?: typeof fetch;
}

export interface CallOptions extends RequestInit {
  clientIp?: string;
  public?: boolean;
}

export function createKongClient(opts: KongClientOptions) {
  const doFetch = opts.fetchImpl ?? fetch;

  async function call(path: string, options: CallOptions): Promise<Response> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };
    if (options.clientIp !== undefined) {
      headers["X-Forwarded-For"] = options.clientIp;
    }
    if (!options.public) {
      headers["Authorization"] = `Bearer ${await opts.getToken()}`;
    }
    const init: CallOptions = { ...options };
    delete init.clientIp;
    delete init.public;
    return doFetch(`${opts.baseUrl}${path}`, { ...init, headers });
  }

  return { call };
}
