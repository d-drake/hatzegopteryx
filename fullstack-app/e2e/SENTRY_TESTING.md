# Sentry Integration Testing Guide

## Overview

The Hatzegopteryx application has Sentry integration configured for error tracking and performance monitoring. This guide explains how to test and verify Sentry integration.

## Sentry Configuration

- **Organization**: pdev-zx
- **Frontend Project**: hatzegopteryx-frontend
- **Backend Project**: hatzegopteryx-backend
- **Region**: US (https://us.sentry.io)

## Running Sentry Tests

### Prerequisites

For Sentry tests to run (not skip), you need to set the `NEXT_PUBLIC_SENTRY_DSN` environment variable:

```bash
# In frontend/.env.local
NEXT_PUBLIC_SENTRY_DSN=https://bd59a0216d62ba6eaee98cf2736148a2@o4509559645405184.ingest.us.sentry.io/4509559887298560
```

### Running the Tests

```bash
# Run all Sentry integration tests
npm run test:e2e -- --grep "Sentry Integration"

# Run helper tests (manual verification)
npm run test:e2e -- --grep "Sentry MCP Helper" --headed
```

## Enhanced Sentry Tests

The Sentry integration tests have been enhanced to:

1. **Verify Sentry initialization** - Checks version, DSN, and environment
2. **Test error capture** - Sends test errors with timestamps for easy identification
3. **Check performance monitoring** - Verifies tracesSampleRate configuration
4. **Validate API error handling** - Ensures errors don't crash the application
5. **Track navigation events** - Verifies breadcrumb capture
6. **Confirm DSN configuration** - Validates proper Sentry setup

## Using Sentry MCP for Verification

When Sentry MCP is authenticated, you can verify test errors:

```javascript
// Find recent issues
mcp__sentry__find_issues({
  organizationSlug: "pdev-zx",
  projectSlug: "hatzegopteryx-frontend",
  regionUrl: "https://us.sentry.io",
  query: "is:unresolved",
  sortBy: "last_seen"
})

// Find specific test errors
mcp__sentry__find_errors({
  organizationSlug: "pdev-zx",
  projectSlug: "hatzegopteryx-frontend",
  regionUrl: "https://us.sentry.io",
  query: "E2E Test Error"
})

// Get issue details
mcp__sentry__get_issue_details({
  organizationSlug: "pdev-zx",
  issueId: "HATZEGOPTERYX-FRONTEND-4"
})
```

## Current Issues in Sentry

As of the last check:
- **HATZEGOPTERYX-FRONTEND-3**: N+1 API Call issue in SPC Dashboard
- **HATZEGOPTERYX-FRONTEND-4**: Test errors from E2E tests

## Test Environment Notes

- Sentry tests will skip if `NEXT_PUBLIC_SENTRY_DSN` is not set
- In CI/CD, tests skip gracefully without breaking the build
- Error capture may not send to Sentry in development mode
- Use production builds for full Sentry functionality testing

## Debugging Tips

1. Check browser console for Sentry initialization messages
2. Look for network requests to `ingest.sentry.io`
3. Use `console.log` statements in tests to see captured data
4. Verify errors appear in Sentry dashboard within 1-2 minutes

## Direct Links

- Frontend Project: https://pdev-zx.sentry.io/projects/hatzegopteryx-frontend/
- Backend Project: https://pdev-zx.sentry.io/projects/hatzegopteryx-backend/
- Organization Dashboard: https://pdev-zx.sentry.io/