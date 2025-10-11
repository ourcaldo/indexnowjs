/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer, webpack }) => {
    // Suppress critical dependency warnings from Supabase realtime
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /\/node_modules\/@supabase\/realtime-js\//,
        (data) => {
          delete data.dependencies[0].critical;
          return data;
        }
      )
    )
    
    // Ignore warnings for websocket modules
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@supabase\/realtime-js/,
      },
      {
        message: /Critical dependency: the request of a dependency is an expression/,
      }
    ]
    
    return config
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        `localhost:5000`, `0.0.0.0:5000`, 
        // Subdomain support for production
        'dashboard.indexnow.studio', 'backend.indexnow.studio', 'api.indexnow.studio', 'www.indexnow.studio', 'indexnow.studio',
        // Subdomain support for development
        'dashboard.localhost:5000', 'backend.localhost:5000', 'api.localhost:5000', 'www.localhost:5000'
      ]
    },
    workerThreads: false
  },
  allowedDevOrigins: [
    'localhost:5000', '0.0.0.0:5000', '127.0.0.1:5000',
    // Subdomain support for development
    'dashboard.localhost:5000', 'backend.localhost:5000', 'api.localhost:5000', 'www.localhost:5000'
  ],

  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Keep console logs always enabled
  compiler: {
    removeConsole: false,
  },
  // Reduce concurrent builds
  // Note: Consolidated experimental config to avoid duplication
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Basic Security Headers (Existing)
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // NOTE: All CORS headers now handled exclusively in middleware.ts for dynamic behavior
          // ENHANCEMENT #3: Advanced Security Headers
          // Content Security Policy (CSP) - Flexible settings for external assets
          {
            key: 'Content-Security-Policy',
            value: `
              default-src * data: blob: ws: wss:;
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:;
              style-src 'self' 'unsafe-inline' https:;
              img-src * data: blob:;
              font-src * data:;
              connect-src *;
              frame-src *;
              media-src *;
              worker-src blob: 'self';
              object-src 'none';
              base-uri 'self';
              form-action 'self';
              report-uri https://o4510101498953728.ingest.us.sentry.io/api/4510135644979200/security/?sentry_key=f9ce6d46522bc4d89c17750fb24cf76a;
              report-to csp-endpoint;
            `.replace(/\s{2,}/g, ' ').trim(),
          },
          // CSP Violation Reporting Configuration
          {
            key: 'Report-To',
            value: JSON.stringify({
              group: 'csp-endpoint',
              max_age: 10886400,
              endpoints: [
                {
                  url: 'https://o4510101498953728.ingest.us.sentry.io/api/4510135644979200/security/?sentry_key=f9ce6d46522bc4d89c17750fb24cf76a',
                },
              ],
            }),
          },
          // HTTP Strict Transport Security (HSTS) - Disabled for development behavior
          // (Removed production-only logic)
          // Permissions Policy - Control Browser Features  
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=(), web-share=(), fullscreen=(self), document-domain=()',
          },
          // Cross-Origin Protection (Enhanced)
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none', // Keep permissive for now to avoid breaking resources
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
          // Additional Security Headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'X-Download-Options',
            value: 'noopen',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  async redirects() {
    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard.indexnow.studio';
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend.indexnow.studio';
    
    return [
      {
        source: '/dashboard/:path*',
        destination: `${dashboardUrl}/:path*`,
        permanent: true,
      },
      {
        source: '/backend/admin/:path*',
        destination: `${backendUrl}/:path*`,
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;