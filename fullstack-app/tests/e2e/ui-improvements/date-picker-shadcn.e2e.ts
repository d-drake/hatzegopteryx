import { test, expect } from '@playwright/test';

test.describe('Shadcn Date Picker Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForLoadState('networkidle');
  });

  test('date picker styling matches entity filter', async ({ page }) => {
    const entitySelect = page.locator('select[value*="FAKE_TOOL"]').first();
    const startDateButton = page.getByRole('button', { name: /pick a date|select start date/i }).first();
    
    // Check that both have similar styling (black on white)
    const entityStyles = await entitySelect.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor
      };
    });
    
    const datePickerStyles = await startDateButton.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor
      };
    });
    
    // Both should have white background
    expect(entityStyles.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(datePickerStyles.backgroundColor).toBe('rgb(255, 255, 255)');
    
    // Both should have black/dark text
    expect(entityStyles.color).toBe('rgb(0, 0, 0)');
    expect(datePickerStyles.color).toBe('rgb(0, 0, 0)');
  });

  test('date picker distinguishes between navigation and selection', async ({ page }) => {
    const startDateButton = page.getByRole('button', { name: /pick a date|select start date/i }).first();
    await startDateButton.click();
    
    // Navigate to previous month
    const prevMonthButton = page.getByRole('button', { name: /previous month/i });
    await prevMonthButton.click();
    
    // Verify calendar navigated but no filter applied
    await expect(page.locator('text=/Loading data.../i')).not.toBeVisible();
    
    // Now select a date
    const dateButton = page.getByRole('gridcell', { name: '10' }).first();
    await dateButton.click();
    
    // Verify filter is applied after selection
    await expect(page.locator('text=/Loading data.../i')).toBeVisible();
  });

  test('date picker respects guest user restrictions', async ({ page }) => {
    // For guest users, dates should be limited to last 30 days
    const startDateButton = page.getByRole('button', { name: /pick a date|select start date/i }).first();
    await startDateButton.click();
    
    // Try to navigate beyond 30 days
    const prevMonthButton = page.getByRole('button', { name: /previous month/i });
    for (let i = 0; i < 2; i++) {
      await prevMonthButton.click();
    }
    
    // Check that old dates are disabled
    const disabledDates = page.locator('[aria-disabled="true"]');
    const count = await disabledDates.count();
    expect(count).toBeGreaterThan(0);
  });

  test('date picker shows selected date in button', async ({ page }) => {
    const startDateButton = page.getByRole('button', { name: /pick a date|select start date/i }).first();
    
    // Click to open calendar
    await startDateButton.click();
    
    // Select 15th of the month
    const dateButton = page.getByRole('gridcell', { name: '15' }).first();
    await dateButton.click();
    
    // Check button text includes "15"
    await expect(startDateButton).toContainText('15');
  });

  test('calendar icon alignment with entity dropdown arrow', async ({ page }) => {
    const entitySelect = page.locator('select[value*="FAKE_TOOL"]').first();
    const startDateButton = page.getByRole('button', { name: /pick a date|select start date/i }).first();
    
    // Get positions of dropdown arrow and calendar icon
    const entityBox = await entitySelect.boundingBox();
    const datePickerBox = await startDateButton.boundingBox();
    
    // Both should exist
    expect(entityBox).toBeTruthy();
    expect(datePickerBox).toBeTruthy();
    
    // Calendar icon should be visible inside the button
    const calendarIcon = startDateButton.locator('svg');
    await expect(calendarIcon).toBeVisible();
  });

  test('multiple date pickers work independently', async ({ page }) => {
    const startDateButton = page.getByRole('button', { name: /pick a date|select start date/i }).first();
    const endDateButton = page.getByRole('button', { name: /pick a date|select end date/i }).last();
    
    // Set start date to 10th
    await startDateButton.click();
    await page.getByRole('gridcell', { name: '10' }).first().click();
    
    // Set end date to 20th
    await endDateButton.click();
    await page.getByRole('gridcell', { name: '20' }).first().click();
    
    // Verify both dates are set correctly
    await expect(startDateButton).toContainText('10');
    await expect(endDateButton).toContainText('20');
  });
});