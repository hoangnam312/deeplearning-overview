import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
};
export default nextConfig;
