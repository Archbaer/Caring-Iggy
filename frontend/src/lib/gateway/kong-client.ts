export interface KongClientOptions {
  baseUrl: string;
  getToken: () => Promise<string>;
  fetchImpl?: typeof fetch;
}

export interface CallOptions extends RequestInit {
  clientIp: string;
  public?: boolean;
}

export function createKongClient(opts: KongClientOptions) {
  const doFetch = opts.fetchImpl ?? fetch;

  async function call(path: string, options: CallOptions): Promise<Response> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
      "X-Forwarded-For": options.clientIp,
    };
    if (!options.public) {
      headers["Authorization"] = `Bearer ${await opts.getToken()}`;
    }
    const { clientIp, public: _pub, ...init } = options;
    return doFetch(`${opts.baseUrl}${path}`, { ...init, headers });
  }

  return { call };
}
