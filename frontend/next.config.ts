import type { NextConfig } from "next";

function toRemotePattern(source?: string): URL[] {
  if (!source) {
    return [];
  }

  try {
    const url = new URL(source);
    const pathname = url.pathname === "/" ? "/**" : `${url.pathname.replace(/\/$/, "") || ""}/**`;

    return [new URL(`${url.protocol}//${url.host}${pathname}`)];
  } catch {
    return [];
  }
}

const explicitRemotePatterns = [
  new URL("http://localhost:8081/**"),
  new URL("http://127.0.0.1:8081/**"),
  new URL("http://animal-service:8081/**"),
  ...toRemotePattern(process.env.ANIMAL_SERVICE_URL),
  new URL("https://images.unsplash.com"),
].filter(
  (pattern, index, patterns) =>
    patterns.findIndex(
      (candidate) =>
        candidate.protocol === pattern.protocol &&
        candidate.hostname === pattern.hostname &&
        candidate.port === pattern.port &&
        candidate.pathname === pattern.pathname,
    ) === index,
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: explicitRemotePatterns,
  },
};

export default nextConfig;
