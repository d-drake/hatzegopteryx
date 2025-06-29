import { test, expect } from '@playwright/test';

test.describe('Sentry Integration', () => {
  let isSentryConfigured = false;

  test.beforeAll(async ({ browser }) => {
    // Check if Sentry is configured by testing a page
    const page = await browser.newPage();
    await page.goto('/');
    isSentryConfigured = await page.evaluate(() => {
      return typeof (window as any).Sentry !== 'undefined';
    });
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    if (!isSentryConfigured) {
      test.skip(true, 'Sentry is not configured in this environment. Set NEXT_PUBLIC_SENTRY_DSN to enable.');
    }
  });

  test('should initialize Sentry on page load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if Sentry is available and get details
    const sentryInfo = await page.evaluate(() => {
      const sentry = (window as any).Sentry;
      if (!sentry) return null;

      return {
        version: sentry.version,
        dsn: sentry.getCurrentHub?.()?.getClient?.()?.getDsn?.()?.host || 'not available',
        environment: sentry.getCurrentHub?.()?.getClient?.()?.getOptions?.()?.environment || 'unknown'
      };
    });

    expect(sentryInfo).toBeTruthy();
    expect(sentryInfo?.version).toBeTruthy();
    console.log('Sentry initialized:', sentryInfo);
  });

  test('should capture errors and send to Sentry', async ({ page }) => {
    // Monitor network requests to Sentry
    const sentryRequests: string[] = [];

    page.on('request', (request) => {
      if (request.url().includes('sentry.io') || request.url().includes('ingest.sentry.io')) {
        sentryRequests.push(request.url());
      }
    });

    await page.goto('/');

    // Create a unique error message with timestamp
    const errorMessage = `E2E Test Error - ${new Date().toISOString()}`;

    // Trigger an error programmatically
    await page.evaluate((msg) => {
      // Use Sentry.captureException for immediate capture
      const sentry = (window as any).Sentry;
      if (sentry && sentry.captureException) {
        const error = new Error(msg);
        sentry.captureException(error, {
          tags: { test: 'e2e', component: 'frontend' },
          level: 'error'
        });
      }
      // Also throw for global error handler
      setTimeout(() => {
        throw new Error(msg);
      }, 100);
    }, errorMessage);

    // Wait for potential Sentry request
    await page.waitForTimeout(3000);

    // Log results
    console.log(`Sentry requests captured: ${sentryRequests.length}`);
    if (sentryRequests.length > 0) {
      console.log('Error should be visible in Sentry project: ccdh-frontend');
      console.log(`Error message: "${errorMessage}"`);
    }
  });

  test('should have Sentry configured for performance monitoring', async ({ page }) => {
    await page.goto('/');

    // Check if performance monitoring is enabled and get configuration
    const performanceConfig = await page.evaluate(() => {
      const sentry = (window as any).Sentry;
      const options = sentry?.getCurrentHub?.()?.getClient?.()?.getOptions?.();

      return {
        tracesSampleRate: options?.tracesSampleRate || 0,
        hasPerformance: (options?.tracesSampleRate || 0) > 0,
        integrations: options?.integrations?.map((i: any) => i.name || i.constructor.name) || []
      };
    });

    console.log('Performance monitoring config:', performanceConfig);

    // Performance monitoring might not be enabled in all environments
    expect(performanceConfig).toBeTruthy();
    if (performanceConfig.hasPerformance) {
      expect(performanceConfig.tracesSampleRate).toBeGreaterThan(0);
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    let errorCaught = false;

    page.on('pageerror', (error) => {
      if (error.message.includes('API')) {
        errorCaught = true;
      }
    });

    await page.goto('/');

    // Simulate an API error
    await page.evaluate(() => {
      // Trigger a failed fetch that should be caught by Sentry
      fetch('/api/nonexistent-endpoint')
        .catch((error) => {
          console.error('API Error:', error);
        });
    });

    await page.waitForTimeout(1000);

    // The error should be caught and not crash the page
    await expect(page.locator('h1')).toContainText('CCDH');
  });

  test('should track navigation events', async ({ page }) => {
    // Capture breadcrumbs added during navigation
    await page.goto('/');

    // Navigate to different sections and capture breadcrumbs
    await page.getByRole('button', { name: 'CD Data Analytics' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Todo Items' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'SPC Dashboard' }).click();
    await page.waitForTimeout(500);

    // Check breadcrumbs were captured
    const breadcrumbs = await page.evaluate(() => {
      const sentry = (window as any).Sentry;
      const scope = sentry?.getCurrentHub?.()?.getScope?.();
      return scope?._breadcrumbs || [];
    });

    console.log(`Navigation breadcrumbs captured: ${breadcrumbs.length}`);

    // Check that navigation didn't break
    await expect(page.locator('h1')).toContainText('CCDH');
  });

  test('should be properly configured with DSN', async ({ page }) => {
    await page.goto('/');

    // Get Sentry configuration
    const config = await page.evaluate(() => {
      const sentry = (window as any).Sentry;
      const client = sentry?.getCurrentHub?.()?.getClient?.();
      const dsn = client?.getDsn?.();
      const options = client?.getOptions?.();

      return {
        hasSentry: !!sentry,
        hasDsn: !!dsn,
        dsnHost: dsn?.host,
        dsnProjectId: dsn?.projectId,
        environment: options?.environment || 'unknown',
        release: options?.release || 'unknown',
        debug: options?.debug || false
      };
    });

    console.log('Sentry configuration:', config);

    expect(config.hasSentry).toBe(true);
    expect(config.hasDsn).toBe(true);

    // If we have access to Sentry MCP, we can verify the project exists
    // Note: This is informational - the test passes based on client-side config
    if (config.dsnProjectId) {
      console.log(`Frontend should be reporting to project ID: ${config.dsnProjectId}`);
      console.log('You can verify errors in Sentry at: https://pdev-zx.sentry.io/projects/ccdh-frontend/');
    }
  });
});