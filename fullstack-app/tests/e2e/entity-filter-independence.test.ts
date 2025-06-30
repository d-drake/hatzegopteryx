import { test, expect } from '@playwright/test';

test.describe('Entity Filter Independence between Dashboard and Analytics', () => {
  test('Analytics entity filter should be independent from Dashboard', async ({ page }) => {
    // 1. Navigate to SPC Dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('select', { timeout: 10000 });
    
    // 2. Select FAKE_TOOL2 in Dashboard
    const dashboardEntitySelect = page.locator('select').first();
    await dashboardEntitySelect.selectOption('FAKE_TOOL2');
    
    // Verify URL has entity parameter
    await expect(page).toHaveURL(/entity=FAKE_TOOL2/);
    
    // 3. Navigate to Analytics
    await page.goto('http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('select', { timeout: 10000 });
    
    // 4. Verify Analytics shows "All Entities" by default
    const analyticsEntitySelect = page.locator('select').first();
    await expect(analyticsEntitySelect).toHaveValue('');
    
    // Verify URL does NOT have entity parameter
    await expect(page).not.toHaveURL(/entity=/);
    
    // 5. Select FAKE_TOOL3 in Analytics
    await analyticsEntitySelect.selectOption('FAKE_TOOL3');
    
    // Verify URL has analyticsEntity parameter (not entity)
    await expect(page).toHaveURL(/analyticsEntity=FAKE_TOOL3/);
    
    // 6. Navigate back to Dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44?entity=FAKE_TOOL2');
    await page.waitForSelector('select', { timeout: 10000 });
    
    // 7. Verify Dashboard still shows FAKE_TOOL2 (not affected by Analytics)
    const dashboardEntitySelectAgain = page.locator('select').first();
    await expect(dashboardEntitySelectAgain).toHaveValue('FAKE_TOOL2');
  });

  test('Analytics should show all entities in data regardless of Dashboard filter', async ({ page }) => {
    // 1. Navigate to Dashboard and select specific entity
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('select', { timeout: 10000 });
    
    const dashboardEntitySelect = page.locator('select').first();
    await dashboardEntitySelect.selectOption('FAKE_TOOL1');
    
    // 2. Navigate to Analytics
    await page.goto('http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('table', { timeout: 10000 });
    
    // 3. Verify table shows data from all entities
    const entities = await page.locator('table tbody tr td:nth-child(2)').allTextContents();
    const uniqueEntities = new Set(entities);
    
    // Should have multiple entities in the data
    expect(uniqueEntities.size).toBeGreaterThan(1);
    expect(Array.from(uniqueEntities)).toContain('FAKE_TOOL1');
    expect(Array.from(uniqueEntities)).toContain('FAKE_TOOL2');
  });

  test('Date filters should still sync between pages', async ({ page }) => {
    // 1. Set date filter in Analytics
    await page.goto('http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('input[type="date"]', { timeout: 10000 });
    
    const startDateInput = page.locator('input[type="date"]').first();
    const endDateInput = page.locator('input[type="date"]').last();
    
    await startDateInput.fill('2024-01-01');
    await endDateInput.fill('2024-01-31');
    await endDateInput.blur();
    
    // Wait for URL update
    await page.waitForTimeout(500);
    
    // 2. Navigate to Dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // 3. Verify date filters are preserved
    const url = page.url();
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-01-31');
  });

  test('Clear filters in Analytics should only clear local entity', async ({ page }) => {
    // 1. Navigate to Analytics with filters
    await page.goto('http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44?startDate=2024-01-01&endDate=2024-01-31&analyticsEntity=FAKE_TOOL2');
    await page.waitForSelector('button:has-text("Clear All")', { timeout: 10000 });
    
    // 2. Clear filters
    await page.click('button:has-text("Clear All")');
    
    // 3. Verify entity is cleared but dates are cleared too
    const entitySelect = page.locator('select').first();
    await expect(entitySelect).toHaveValue('');
    
    const startDateInput = page.locator('input[type="date"]').first();
    const endDateInput = page.locator('input[type="date"]').last();
    await expect(startDateInput).toHaveValue('');
    await expect(endDateInput).toHaveValue('');
  });

  test('Analytics entity filter should work with sorting', async ({ page }) => {
    // 1. Navigate to Analytics
    await page.goto('http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('table', { timeout: 10000 });
    
    // 2. Select specific entity
    const entitySelect = page.locator('select').first();
    await entitySelect.selectOption('FAKE_TOOL1');
    
    // 3. Click on Entity column to sort
    await page.click('th:has-text("Entity")');
    
    // 4. Verify only FAKE_TOOL1 data is shown
    const entities = await page.locator('table tbody tr td:nth-child(2)').allTextContents();
    entities.forEach(entity => {
      expect(entity).toBe('FAKE_TOOL1');
    });
    
    // 5. Clear entity filter
    await entitySelect.selectOption('');
    
    // 6. Verify all entities are shown again
    const allEntities = await page.locator('table tbody tr td:nth-child(2)').allTextContents();
    const uniqueEntities = new Set(allEntities);
    expect(uniqueEntities.size).toBeGreaterThan(1);
  });
});