import { test, expect } from '@playwright/test';

test.describe('Frontend Health Checks', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads without errors
    await expect(page).toHaveTitle('Cloud Critical Dimension Hub');

    // Check for main navigation tabs
    await expect(page.getByRole('button', { name: 'SPC Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'SPC Analytics' })).toBeVisible();
    // Note: "To Do Items" tab is only visible to superusers
  });

  test('should navigate to SPC Dashboard', async ({ page }) => {
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check for SPC dashboard elements
    await expect(page.locator('h2')).toContainText('SPC Data Dashboard');

    // Check for SPC monitor tabs
    await expect(page.getByRole('button', { name: 'SPC_CD_L1' })).toBeVisible();
  });

  test('should make successful API calls', async ({ page }) => {
    // Listen for API responses
    const apiResponses: string[] = [];

    page.on('response', (response) => {
      if (response.url().includes('localhost:8000')) {
        apiResponses.push(response.url());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on SPC Analytics tab
    await page.getByRole('button', { name: 'SPC Analytics' }).click();

    // Wait for API calls
    await page.waitForTimeout(1000);

    // Check that API calls were made
    expect(apiResponses.length).toBeGreaterThan(0);

    // Check for successful responses
    for (const url of apiResponses) {
      const response = await page.request.get(url);
      expect(response.status()).toBe(200);
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.locator('.container').first()).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.container').first()).toBeVisible();
  });
});