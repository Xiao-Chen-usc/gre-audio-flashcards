import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.GRE_BASE_PATH || undefined,
};

export default nextConfig;
