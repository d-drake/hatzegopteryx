import { test, expect } from '@playwright/test';

test.describe('Date Picker Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForLoadState('networkidle');
  });

  test('date picker opens calendar on click', async ({ page }) => {
    // Click on the start date picker button
    const startDateButton = page.getByRole('button', { name: /pick a date|select start date/i }).first();
    await startDateButton.click();

    // Check that the calendar is visible
    const calendar = page.getByRole('grid');
    await expect(calendar).toBeVisible();

    // Click on a specific date (e.g., 15th of the month)
    const dateButton = page.getByRole('gridcell', { name: '15' }).first();
    await dateButton.click();

    // Calendar should close after selection
    await expect(calendar).not.toBeVisible();

    // The selected date should be displayed in the button
    await expect(startDateButton).toContainText('15');
  });

  test('date picker respects min/max date constraints', async ({ page }) => {
    // For guest users, dates should be limited to last 30 days
    const startDateButton = page.getByRole('button', { name: /pick a date|select start date/i }).first();
    await startDateButton.click();

    // Try to navigate to a month beyond the allowed range
    const prevMonthButton = page.getByRole('button', { name: /previous month/i });
    
    // Click previous month multiple times
    for (let i = 0; i < 3; i++) {
      await prevMonthButton.click();
    }

    // Check that dates beyond 30 days ago are disabled
    const disabledDates = page.locator('[aria-disabled="true"]');
    const count = await disabledDates.count();
    expect(count).toBeGreaterThan(0);
  });

  test('selecting date immediately updates filter', async ({ page }) => {
    // Get initial data count
    await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
    
    // Click on end date picker
    const endDateButton = page.getByRole('button', { name: /pick a date|select end date/i }).last();
    await endDateButton.click();

    // Select a date
    const dateButton = page.getByRole('gridcell', { name: '10' }).first();
    await dateButton.click();

    // Check that loading indicator appears (indicating filter was applied)
    const loadingIndicator = page.locator('text=/Loading data.../i');
    await expect(loadingIndicator).toBeVisible({ timeout: 5000 });
  });
});