import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  skipTrailingSlashRedirect: true,
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
    const rawBackendUrl = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:8000/api';
    const cleanBackendUrl = rawBackendUrl.replace(/\/+$/, '');
    const backendBase = cleanBackendUrl.replace(/\/api$/, '');
    return [
      {
        source: '/api/:path*/',
        destination: `${cleanBackendUrl}/:path*/`,
      },
      {
        source: '/api/:path*',
        destination: `${cleanBackendUrl}/:path*`,
      },
      {
        source: '/media/:path*',
        destination: `${backendBase}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
