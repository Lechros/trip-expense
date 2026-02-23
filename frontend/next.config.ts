import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "";

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendUrl) return [];
    return [{ source: "/api/:path*", destination: `${backendUrl.replace(/\/$/, "")}/:path*` }];
  },
};

export default nextConfig;
