import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // @ts-ignore - Next.js 16/15 property for allowing dev origins in Docker/Proxies
  allowedDevOrigins: [
    'nectarlabs.dev', 
    'www.nectarlabs.dev', 
    'staging.nectarlabs.dev', 
    'www.staging.nectarlabs.dev',
    '*.staging.nectarlabs.dev',
    '*.localhost',
    '*.localhost:3000',
    '*.localhost:3002'
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://backend:8000/api'}/:path*/`,
      },
    ];
  },
};

export default nextConfig;
