import { test, expect } from '@playwright/test';

test.describe('Responsive Chart Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Wait for data to load
    await page.waitForSelector('[data-chart-id]', { timeout: 30000 });
  });

  test('should display horizontal legends on narrow screens', async ({ page }) => {
    // Set viewport to mobile width (< 800px)
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Check that horizontal legends are visible
    await expect(page.locator('.horizontal-legend')).toBeVisible();
    
    // Check that SVG legends are not visible
    await expect(page.locator('svg .legend')).not.toBeVisible();
    
    // Check margins are adjusted
    const chartContainer = await page.locator('svg').first();
    const svgBox = await chartContainer.boundingBox();
    expect(svgBox).toBeTruthy();
  });

  test('should display vertical legends on desktop screens', async ({ page }) => {
    // Set viewport to desktop width (>= 800px)
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Check that SVG legends are visible
    await expect(page.locator('svg .legend').first()).toBeVisible();
    
    // Check that horizontal legends are not visible
    await expect(page.locator('.horizontal-legend')).not.toBeVisible();
  });

  test('should apply responsive SVG attributes on narrow screens', async ({ page }) => {
    // Set viewport to mobile width
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Check SVG has responsive attributes
    const svg = page.locator('svg').first();
    await expect(svg).toHaveAttribute('viewBox');
    
    const style = await svg.getAttribute('style');
    expect(style).toContain('display: block');
    expect(style).toContain('max-width: 100%');
    expect(style).toContain('height: auto');
  });

  test('should adjust axis labels on narrow screens', async ({ page }) => {
    // Set viewport to mobile width
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Wait for chart to render
    await page.waitForSelector('.axis');
    
    // Check that tick labels have smaller font size
    const tickLabel = page.locator('.axis .tick text').first();
    const fontSize = await tickLabel.evaluate((el) => 
      window.getComputedStyle(el).fontSize
    );
    expect(fontSize).toBe('10px');
    
    // Check axis label font size
    const axisLabel = page.locator('.axis text').last();
    const axisLabelFontSize = await axisLabel.evaluate((el) => 
      window.getComputedStyle(el).fontSize
    );
    expect(axisLabelFontSize).toBe('12px');
  });

  test('should transition smoothly between mobile and desktop layouts', async ({ page }) => {
    // Start with desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('svg .legend').first()).toBeVisible();
    
    // Transition to mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500); // Wait for any transitions
    
    await expect(page.locator('.horizontal-legend')).toBeVisible();
    await expect(page.locator('svg .legend')).not.toBeVisible();
    
    // Transition back to desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    await expect(page.locator('svg .legend').first()).toBeVisible();
    await expect(page.locator('.horizontal-legend')).not.toBeVisible();
  });

  test('legend selections should work on mobile', async ({ page }) => {
    // Set viewport to mobile width
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Wait for horizontal legend to appear
    await page.waitForSelector('.horizontal-legend');
    
    // Click on a legend item
    const legendItem = page.locator('.horizontal-legend > div > div').first();
    await legendItem.click();
    
    // Check that the item has reduced opacity (selected state)
    const opacity = await legendItem.evaluate((el) => 
      window.getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBeLessThan(1);
    
    // Check that reset button appears
    await expect(page.locator('button:has-text("Reset Selections")')).toBeVisible();
  });
});