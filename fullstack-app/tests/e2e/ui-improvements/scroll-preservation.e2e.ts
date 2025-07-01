import { test, expect } from '@playwright/test';

test.describe('Scroll Position Preservation', () => {
  test.describe('SPC Dashboard', () => {
    test('preserves scroll position when changing entity filter', async ({ page }) => {
      // Navigate to SPC Dashboard
      await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForLoadState('networkidle');
      
      // Wait for data to load
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      // Scroll down to charts
      await page.evaluate(() => window.scrollTo(0, 800));
      const scrollPositionBefore = await page.evaluate(() => window.scrollY);
      expect(scrollPositionBefore).toBeGreaterThan(700);
      
      // Change entity filter
      const entitySelect = page.locator('select[value*="FAKE_TOOL"]').first();
      const currentEntity = await entitySelect.inputValue();
      const newEntity = currentEntity === 'FAKE_TOOL1' ? 'FAKE_TOOL2' : 'FAKE_TOOL1';
      await entitySelect.selectOption(newEntity);
      
      // Wait for data to reload
      await page.waitForSelector('text=/Loading data.../i', { state: 'visible' });
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      // Check scroll position is preserved
      const scrollPositionAfter = await page.evaluate(() => window.scrollY);
      expect(Math.abs(scrollPositionAfter - scrollPositionBefore)).toBeLessThan(50);
    });

    test('preserves scroll position when changing date filter', async ({ page }) => {
      await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      // Scroll to middle of page
      await page.evaluate(() => window.scrollTo(0, 600));
      const scrollPositionBefore = await page.evaluate(() => window.scrollY);
      
      // Open date picker and select a date
      const startDateButton = page.getByRole('button', { name: /pick a date|select start date/i }).first();
      await startDateButton.click();
      
      // Select a date (15th of current month)
      const dateButton = page.getByRole('gridcell', { name: '15' }).first();
      await dateButton.click();
      
      // Wait for data to reload
      await page.waitForSelector('text=/Loading data.../i', { state: 'visible' });
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      // Check scroll position is preserved
      const scrollPositionAfter = await page.evaluate(() => window.scrollY);
      expect(Math.abs(scrollPositionAfter - scrollPositionBefore)).toBeLessThan(50);
    });
  });

  test.describe('SPC Analytics', () => {
    test('preserves scroll position when changing entity filter', async ({ page }) => {
      await page.goto('/spc-analytics/SPC_CD_L1/1000-BNT44');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      // Scroll to data table
      await page.evaluate(() => window.scrollTo(0, 1000));
      const scrollPositionBefore = await page.evaluate(() => window.scrollY);
      expect(scrollPositionBefore).toBeGreaterThan(900);
      
      // Change entity filter
      const entitySelect = page.locator('select').nth(1); // Second select is analytics entity
      await entitySelect.selectOption('FAKE_TOOL3');
      
      // Wait for any loading to complete
      await page.waitForTimeout(500);
      
      // Check scroll position is preserved
      const scrollPositionAfter = await page.evaluate(() => window.scrollY);
      expect(Math.abs(scrollPositionAfter - scrollPositionBefore)).toBeLessThan(50);
    });

    test('preserves scroll position when changing date filter', async ({ page }) => {
      await page.goto('/spc-analytics/SPC_CD_L1/1000-BNT44');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      // Scroll to middle of page
      await page.evaluate(() => window.scrollTo(0, 700));
      const scrollPositionBefore = await page.evaluate(() => window.scrollY);
      
      // Change end date
      const endDateButton = page.getByRole('button', { name: /pick a date|select end date/i }).last();
      await endDateButton.click();
      
      // Select a date
      const dateButton = page.getByRole('gridcell', { name: '20' }).first();
      await dateButton.click();
      
      // Wait for data to reload
      await page.waitForSelector('text=/Loading data.../i', { state: 'visible' });
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      // Check scroll position is preserved
      const scrollPositionAfter = await page.evaluate(() => window.scrollY);
      expect(Math.abs(scrollPositionAfter - scrollPositionBefore)).toBeLessThan(50);
    });
  });
});