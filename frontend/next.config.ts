import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // @ts-ignore - allowedDevOrigins might not be in the type yet
  allowedDevOrigins: ['staging.nectarlabs.localhost'],
};

export default nextConfig;
