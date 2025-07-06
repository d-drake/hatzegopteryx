import { test, expect } from '@playwright/test';

test.describe('Frontend Health Checks', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads without errors
    await expect(page).toHaveTitle('Cloud Critical Dimension Hub');

    // Check for homepage content
    await expect(page.locator('h1')).toContainText('Cloud Critical Dimension Hub');
    await expect(page.locator('text=Charting the past, present, and well-controlled future')).toBeVisible();

    // Check for Explore Dashboard button
    await expect(page.getByRole('button', { name: 'Explore Dashboard' })).toBeVisible();
  });

  test('should navigate to SPC Dashboard via Explore button', async ({ page }) => {
    await page.goto('/');

    // Click the Explore Dashboard button
    await page.getByRole('button', { name: 'Explore Dashboard' }).click();

    // Wait for navigation to SPC dashboard
    await page.waitForURL('**/spc-dashboard/SPC_CD_L1/1000-BNT44');

    // Check that we're on the SPC dashboard
    await page.waitForLoadState('networkidle');

    // Check for SPC dashboard elements
    await expect(page.locator('h2')).toContainText('SPC Data Dashboard');

    // Check for SPC monitor tabs
    await expect(page.getByRole('button', { name: 'SPC_CD_L1' })).toBeVisible();

    // Check for main navigation tabs (now visible on SPC dashboard)
    await expect(page.getByRole('button', { name: 'SPC Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'SPC Analytics' })).toBeVisible();
    // Note: "To Do Items" tab is only visible to superusers
  });

  test('should navigate directly to SPC Dashboard', async ({ page }) => {
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
    const apiResponses: Response[] = [];

    page.on('response', (response) => {
      if (response.url().includes('localhost:8000')) {
        apiResponses.push(response);
      }
    });

    // Navigate directly to SPC dashboard where API calls are made
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForLoadState('networkidle');

    // Click on SPC Analytics tab
    await page.getByRole('button', { name: 'SPC Analytics' }).click();

    // Wait for API calls
    await page.waitForTimeout(2000);

    // Check that API calls were made
    expect(apiResponses.length).toBeGreaterThan(0);

    // Check for successful responses (allowing 429 as it's rate limiting)
    for (const response of apiResponses) {
      const status = response.status();
      // Accept 200 (OK) or 429 (Rate Limited) as valid responses
      expect([200, 429]).toContain(status);
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForLoadState('networkidle');
    
    // Check that main content is visible
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SPC Data Dashboard' })).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    // Check that content adapts to mobile
    await expect(page.locator('main')).toBeVisible();
  });
});