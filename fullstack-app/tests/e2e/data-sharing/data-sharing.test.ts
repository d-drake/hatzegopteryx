import { test, expect } from '@playwright/test';

test.describe('Data Sharing between SPC Dashboard and Analytics', () => {
  test('should share data between Dashboard and Analytics pages', async ({ page }) => {
    // Navigate to SPC Dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Wait for data to load
    await page.waitForSelector('text=CD Measurement Analysis', { timeout: 10000 });
    
    // Check that data is loaded (looking for chart content)
    await expect(page.locator('text=CD ATT vs Date')).toBeVisible();
    
    // Navigate to SPC Analytics (same monitor and product)
    await page.goto('http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44');
    
    // Wait for analytics page to load
    await page.waitForSelector('text=SPC Analytics', { timeout: 10000 });
    
    // Check that data is immediately available (no loading)
    await expect(page.locator('text=Total Records')).toBeVisible();
    await expect(page.locator('text=Avg CD ATT')).toBeVisible();
    
    // Navigate back to Dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Data should still be cached
    await expect(page.locator('text=CD ATT vs Date')).toBeVisible({ timeout: 5000 });
  });

  test('should sync date filters between pages', async ({ page }) => {
    // Navigate to SPC Analytics
    await page.goto('http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44');
    
    // Wait for page to load
    await page.waitForSelector('text=Data Filters', { timeout: 10000 });
    
    // Set a specific date range
    const startDateInput = page.locator('input[type="date"]').first();
    const endDateInput = page.locator('input[type="date"]').last();
    
    await startDateInput.fill('2024-01-01');
    await endDateInput.fill('2024-01-31');
    
    // Trigger blur to update filters
    await endDateInput.blur();
    
    // Wait for data update
    await page.waitForTimeout(1000);
    
    // Navigate to Dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Check that date filters are preserved in URL
    const url = page.url();
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-01-31');
  });

  test('should handle entity filter differently in Analytics', async ({ page }) => {
    // Navigate to SPC Dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Wait for filters to load
    await page.waitForSelector('select', { timeout: 10000 });
    
    // Select a specific entity
    const entitySelect = page.locator('select').first();
    await entitySelect.selectOption('FAKE_TOOL2');
    
    // Navigate to Analytics
    await page.goto('http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44');
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Check that all entities are shown in the data (not just FAKE_TOOL2)
    const entities = await page.locator('table tbody tr td:nth-child(2)').allTextContents();
    const uniqueEntities = new Set(entities);
    
    // Should have multiple entities, not just the filtered one
    expect(uniqueEntities.size).toBeGreaterThan(1);
  });

  test('should handle pagination in Analytics with shared data', async ({ page }) => {
    // Navigate to Analytics
    await page.goto('http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44');
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Check pagination controls
    const nextButton = page.locator('button:has-text("Next")').first();
    const prevButton = page.locator('button:has-text("Previous")').first();
    
    // Previous should be disabled on first page
    await expect(prevButton).toBeDisabled();
    
    // Click next
    await nextButton.click();
    
    // Previous should now be enabled
    await expect(prevButton).toBeEnabled();
    
    // Check that we're on page 2
    const pageInfo = await page.locator('text=/Showing \\d+-\\d+/').textContent();
    expect(pageInfo).toContain('51-');
  });
});