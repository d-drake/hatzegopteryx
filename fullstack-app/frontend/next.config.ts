import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Remove static export - we'll use standalone for container deployment
  output: "standalone",
  experimental: {
    // Reduce memory usage during builds (available from v15.0.0)
    webpackMemoryOptimizations: true,
    optimizeCss: false, // Disable CSS optimization as it might cause FOUC
  },
  // Optimize CSS loading
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Disable runtime JS for better performance
  reactStrictMode: true,
  // Disable x-powered-by header
  poweredByHeader: false,
  // Configure headers for preload
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "pdev-zx",
  project: "CCDH",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Disable source map upload in development
  authToken:
    process.env.NODE_ENV === "development"
      ? undefined
      : process.env.SENTRY_AUTH_TOKEN,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js route to circumvent ad-blockers. (increases server load)
  // Disabled for static export
  // tunnelRoute: '/monitoring',

  // Source maps configuration
  sourcemaps: {
    disable: false,
    deleteSourcemapsAfterUpload: process.env.NODE_ENV === "production",
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enable automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  automaticVercelMonitors: true,
});
