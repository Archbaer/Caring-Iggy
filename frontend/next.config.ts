import type { NextConfig } from "next";

const remoteProtocol = (protocol: string) => protocol.replace(/:$/, "") as "http" | "https";

interface RemotePattern {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname: string;
}

function makePatterns(source?: string): RemotePattern[] {
  if (!source) return [];

  try {
    const url = new URL(source);
    const pathname = url.pathname === "/" ? "/**" : `${url.pathname.replace(/\/$/, "") || ""}/**`;
    return [
      {
        protocol: remoteProtocol(url.protocol),
        hostname: url.hostname,
        port: url.port || undefined,
        pathname,
      },
    ];
  } catch {
    return [];
  }
}

const animalUrl = process.env.ANIMAL_SERVICE_URL;
const userUrl = process.env.USER_SERVICE_URL;
const adopterUrl = process.env.ADOPTER_SERVICE_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8081", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8081", pathname: "/**" },
      { protocol: "http", hostname: "animal-service", port: "8081", pathname: "/**" },
      ...(animalUrl ? makePatterns(animalUrl) : []),

      { protocol: "http", hostname: "user-service", port: "8085", pathname: "/**" },
      ...(userUrl ? makePatterns(userUrl) : []),

      { protocol: "http", hostname: "adopter-service", port: "8082", pathname: "/**" },
      ...(adopterUrl ? makePatterns(adopterUrl) : []),

      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
