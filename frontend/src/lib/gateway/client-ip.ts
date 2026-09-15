export interface ResolveClientIpOptions {
  trustProxyHeaders?: boolean;
}

export function resolveClientIp(
  headers: Headers,
  opts?: ResolveClientIpOptions,
): string | undefined {
  if (!opts?.trustProxyHeaders) {
    return undefined;
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return undefined;
}
