import { test, expect } from '@playwright/test';

test.describe('SPC Analytics Table Sorting', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to SPC Analytics page
    await page.goto('http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test('should have DateTime column sorted descending by default', async ({ page }) => {
    // Check for descending arrow on DateTime column
    const dateTimeHeader = page.locator('th:has-text("DateTime")');
    const descendingArrow = dateTimeHeader.locator('svg path[d*="M14.707 10.293"]');
    await expect(descendingArrow).toBeVisible();

    // Verify first row has more recent date than last visible row
    const firstDate = await page.locator('tbody tr:first-child td:first-child').textContent();
    const lastDate = await page.locator('tbody tr:last-child td:first-child').textContent();
    
    const firstDateTime = new Date(firstDate!).getTime();
    const lastDateTime = new Date(lastDate!).getTime();
    
    expect(firstDateTime).toBeGreaterThan(lastDateTime);
  });

  test('should toggle sort direction when clicking same column', async ({ page }) => {
    // Click DateTime header to change to ascending
    await page.click('th:has-text("DateTime")');
    
    // Check for ascending arrow
    const dateTimeHeader = page.locator('th:has-text("DateTime")');
    const ascendingArrow = dateTimeHeader.locator('svg path[d*="M5.293 9.707"]');
    await expect(ascendingArrow).toBeVisible();
    
    // Click again to change back to descending
    await page.click('th:has-text("DateTime")');
    
    // Check for descending arrow
    const descendingArrow = dateTimeHeader.locator('svg path[d*="M14.707 10.293"]');
    await expect(descendingArrow).toBeVisible();
  });

  test('should sort by Entity column alphabetically', async ({ page }) => {
    // Click Entity header
    await page.click('th:has-text("Entity")');
    
    // Wait for sort to apply
    await page.waitForTimeout(500);
    
    // Get all entity values
    const entities = await page.locator('tbody tr td:nth-child(2)').allTextContents();
    
    // Verify alphabetical order
    for (let i = 1; i < entities.length; i++) {
      expect(entities[i].localeCompare(entities[i-1])).toBeGreaterThanOrEqual(0);
    }
  });

  test('should sort numeric columns correctly', async ({ page }) => {
    // Test CD ATT sorting
    await page.click('th:has-text("CD ATT")');
    
    // Wait for sort to apply
    await page.waitForTimeout(500);
    
    // Get CD ATT values
    const cdAttValues = await page.locator('tbody tr td:nth-child(4) span').allTextContents();
    const numbers = cdAttValues.map(v => parseFloat(v));
    
    // Verify ascending order
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThanOrEqual(numbers[i-1]);
    }
    
    // Click again for descending
    await page.click('th:has-text("CD ATT")');
    await page.waitForTimeout(500);
    
    const cdAttValuesDesc = await page.locator('tbody tr td:nth-child(4) span').allTextContents();
    const numbersDesc = cdAttValuesDesc.map(v => parseFloat(v));
    
    // Verify descending order
    for (let i = 1; i < numbersDesc.length; i++) {
      expect(numbersDesc[i]).toBeLessThanOrEqual(numbersDesc[i-1]);
    }
  });

  test('should maintain sort when filtering by entity', async ({ page }) => {
    // Sort by CD ATT ascending
    await page.click('th:has-text("CD ATT")');
    await page.waitForTimeout(500);
    
    // Select specific entity
    const entitySelect = page.locator('select').first();
    await entitySelect.selectOption('FAKE_TOOL1');
    await page.waitForTimeout(500);
    
    // Verify sort is maintained
    const cdAttValues = await page.locator('tbody tr td:nth-child(4) span').allTextContents();
    const numbers = cdAttValues.map(v => parseFloat(v));
    
    // Should still be in ascending order
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThanOrEqual(numbers[i-1]);
    }
    
    // Verify all rows are from FAKE_TOOL1
    const entities = await page.locator('tbody tr td:nth-child(2)').allTextContents();
    entities.forEach(entity => {
      expect(entity).toBe('FAKE_TOOL1');
    });
  });

  test('should reset to page 1 when changing sort', async ({ page }) => {
    // Navigate to page 2
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    
    // Verify on page 2
    const pageInfo = await page.locator('text=/Showing \\d+-\\d+/').first().textContent();
    expect(pageInfo).toContain('51-');
    
    // Change sort
    await page.click('th:has-text("Bias")');
    await page.waitForTimeout(500);
    
    // Should be back on page 1
    const pageInfoAfterSort = await page.locator('text=/Showing \\d+-\\d+/').first().textContent();
    expect(pageInfoAfterSort).toContain('1-');
  });

  test('should show sort indicators only on active column', async ({ page }) => {
    // Initially DateTime should have indicator
    let visibleArrows = await page.locator('th svg').count();
    expect(visibleArrows).toBe(1);
    
    // Click on Entity
    await page.click('th:has-text("Entity")');
    await page.waitForTimeout(500);
    
    // Still only one arrow visible
    visibleArrows = await page.locator('th svg').count();
    expect(visibleArrows).toBe(1);
    
    // Entity should have arrow, DateTime should not
    const entityArrow = page.locator('th:has-text("Entity") svg');
    await expect(entityArrow).toBeVisible();
    
    const dateTimeArrow = page.locator('th:has-text("DateTime") svg');
    await expect(dateTimeArrow).not.toBeVisible();
  });

  test('should handle sorting with date filters', async ({ page }) => {
    // Set date filter
    const startDate = page.locator('input[type="date"]').first();
    await startDate.fill('2024-01-01');
    await startDate.blur();
    await page.waitForTimeout(1000);
    
    // Sort by CD 6σ
    await page.click('th:has-text("CD 6")');
    await page.waitForTimeout(500);
    
    // Get values and verify sort
    const cd6sigValues = await page.locator('tbody tr td:nth-child(5)').allTextContents();
    const numbers = cd6sigValues.map(v => parseFloat(v));
    
    // Verify ascending order
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThanOrEqual(numbers[i-1]);
    }
  });
});