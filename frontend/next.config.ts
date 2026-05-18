import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // @ts-ignore - Next.js 16/15 property for allowing dev origins in Docker/Proxies
  allowedDevOrigins: ['nectarlabs.dev', 'www.nectarlabs.dev'],
};

export default nextConfig;
