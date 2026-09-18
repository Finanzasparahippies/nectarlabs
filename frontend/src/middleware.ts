import { middleware as proxyMiddleware, config as proxyConfig } from './proxy';
import type { NextRequest } from 'next/server';

// Next.js 14 Edge Middleware Entrypoint
export async function middleware(request: NextRequest) {
  return await proxyMiddleware(request);
}

export const config = proxyConfig;
