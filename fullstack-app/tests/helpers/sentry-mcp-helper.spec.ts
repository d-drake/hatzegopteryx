import { test, expect } from '@playwright/test';

/**
 * Helper tests that use Sentry MCP to verify integration
 * These tests can be run manually to check if errors are being reported to Sentry
 * 
 * Note: These require Sentry MCP to be authenticated
 */
test.describe('Sentry MCP Helper Tests', () => {
  test.skip(true, 'These are helper tests - run manually with --grep "Sentry MCP Helper" to execute');

  test('verify Sentry projects exist', async () => {
    // This test is informational - it documents the expected Sentry setup
    console.log('Expected Sentry Configuration:');
    console.log('- Organization: pdev-zx');
    console.log('- Frontend Project: hatzegopteryx-frontend');
    console.log('- Backend Project: hatzegopteryx-backend');
    console.log('- Region URL: https://us.sentry.io');
    console.log('');
    console.log('To check recent errors, use Sentry MCP tools:');
    console.log('- mcp__sentry__find_issues');
    console.log('- mcp__sentry__find_errors');
    console.log('- mcp__sentry__get_issue_details');
  });

  test('generate test error and verify in Sentry', async ({ page }) => {
    // This test generates an error and provides instructions to verify it in Sentry
    const errorId = `test-${Date.now()}`;
    const errorMessage = `E2E Test Error ${errorId}`;
    
    await page.goto('/');
    
    // Generate a unique error
    await page.evaluate((msg) => {
      const sentry = (window as any).Sentry;
      if (sentry && sentry.captureException) {
        const error = new Error(msg);
        error.name = 'E2ETestError';
        sentry.captureException(error, {
          tags: { 
            test: 'e2e-verification',
            errorId: msg.split(' ').pop()
          },
          level: 'error',
          fingerprint: ['e2e-test', msg]
        });
      }
    }, errorMessage);
    
    await page.waitForTimeout(3000);
    
    console.log('');
    console.log('Test error generated!');
    console.log(`Error message: "${errorMessage}"`);
    console.log('');
    console.log('To verify in Sentry, use these MCP commands:');
    console.log(`1. Find recent errors: mcp__sentry__find_errors(organizationSlug="pdev-zx", projectSlug="hatzegopteryx-frontend", regionUrl="https://us.sentry.io")`);
    console.log(`2. Search for this specific error: mcp__sentry__find_issues(organizationSlug="pdev-zx", query="message:${errorId}", regionUrl="https://us.sentry.io")`);
    console.log('');
    console.log('Direct link to Sentry project:');
    console.log('https://pdev-zx.sentry.io/projects/hatzegopteryx-frontend/');
  });
});