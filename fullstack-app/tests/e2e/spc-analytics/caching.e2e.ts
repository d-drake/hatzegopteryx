import { test, expect } from '@playwright/test';

test.describe('Data Caching between Dashboard and Analytics', () => {
  test('should use cached data when navigating between pages', async ({ page }) => {
    // Enable console logging
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    // 1. Navigate to Dashboard - this should fetch data
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('text=CD Measurement Analysis', { timeout: 10000 });
    
    // Clear console logs for next navigation
    consoleLogs.length = 0;
    
    // 2. Navigate to Analytics - should use cached data
    await page.goto('http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Check console for cache message
    const hasCacheMessage = consoleLogs.some(log => log.includes('Using cached data'));
    expect(hasCacheMessage).toBe(true);
    
    // 3. Navigate back to Dashboard - should still use cache
    consoleLogs.length = 0;
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('text=CD Measurement Analysis', { timeout: 10000 });
    
    // Should use cached data again
    const hasCacheMessageAgain = consoleLogs.some(log => log.includes('Using cached data'));
    expect(hasCacheMessageAgain).toBe(true);
  });

  test('should fetch new data when filters change', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    // Navigate to Analytics
    await page.goto('http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('input[type="date"]', { timeout: 10000 });
    
    // Change date filter
    consoleLogs.length = 0;
    const startDate = page.locator('input[type="date"]').first();
    await startDate.fill('2024-01-01');
    await startDate.blur();
    
    // Wait for data fetch
    await page.waitForTimeout(2000);
    
    // Should see fetch message, not cache message
    const hasFetchMessage = consoleLogs.some(log => log.includes('Fetching all entity data'));
    expect(hasFetchMessage).toBe(true);
    
    // Navigate to Dashboard - should use the newly cached data
    consoleLogs.length = 0;
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('text=CD Measurement Analysis', { timeout: 10000 });
    
    const hasCacheMessage = consoleLogs.some(log => log.includes('Using cached data'));
    expect(hasCacheMessage).toBe(true);
  });

  test('should handle different monitor/product combinations independently', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    // 1. Load data for first combination
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('text=CD Measurement Analysis', { timeout: 10000 });
    
    // 2. Navigate to different combination - should fetch new data
    consoleLogs.length = 0;
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L2/2000-BNT45');
    await page.waitForSelector('text=CD Measurement Analysis', { timeout: 10000 });
    
    const hasFetchMessage = consoleLogs.some(log => log.includes('Fetching all entity data'));
    expect(hasFetchMessage).toBe(true);
    
    // 3. Navigate back to first combination - should use cache
    consoleLogs.length = 0;
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('text=CD Measurement Analysis', { timeout: 10000 });
    
    const hasCacheMessage = consoleLogs.some(log => log.includes('Using cached data'));
    expect(hasCacheMessage).toBe(true);
  });
});