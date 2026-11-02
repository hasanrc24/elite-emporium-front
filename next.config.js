import createNextIntlPlugin from 'next-intl/plugin';

const apiOrigin = process.env.API_INTERNAL_ORIGIN || 'http://localhost:4000';
const withNextIntl = createNextIntlPlugin('./i18n/request.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: 'localhost:4000' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: '127.0.0.1:4000' },
    ],
    dangerouslyAllowLocalIP: true,
  },
  async headers() {
    // Clickjacking and referrer hardening (FE-SEC-001); reset-password tokens live in the URL.
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    }];
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
};

export default withNextIntl(nextConfig);
