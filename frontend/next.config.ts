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
    'kores.vip',
    '*.kores.vip',
    '*.localhost',
    '*.localhost:3000',
    '*.localhost:3002'
  ],
  async rewrites() {
    // Si no está definida en el entorno, en Docker se usa http://backend:8000/api y en host http://localhost:8001/api
    const defaultBackendUrl = process.env.NODE_ENV === 'production' ? 'http://backend:8000/api' : 'http://localhost:8001/api';
    const rawBackendUrl = process.env.INTERNAL_API_URL || process.env.API_URL || defaultBackendUrl;
    let cleanBackendUrl = rawBackendUrl.replace(/\/+$/, '');
    if (!cleanBackendUrl.endsWith('/api')) {
      cleanBackendUrl = `${cleanBackendUrl}/api`;
    }
    const backendBase = cleanBackendUrl.replace(/\/api$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${cleanBackendUrl}/:path*/`,
      },
      {
        source: '/media/:path*',
        destination: `${backendBase}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
