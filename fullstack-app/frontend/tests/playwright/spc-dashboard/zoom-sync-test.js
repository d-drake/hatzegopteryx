import { test, expect } from '@playwright/test';

test.describe('SPC Dashboard Zoom Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Wait for data to load
    await page.waitForSelector('.timeline-chart', { timeout: 10000 });
  });

  test('should synchronize Y-axis zoom between Timeline and Variability charts', async ({ page }) => {
    // Get initial Y-axis domain from Timeline chart
    const getYAxisDomain = async (chartSelector) => {
      return await page.evaluate((selector) => {
        const chart = document.querySelector(selector);
        if (!chart) return null;
        
        // Find Y-axis ticks to determine domain
        const ticks = chart.querySelectorAll('.y-axis .tick text');
        const values = Array.from(ticks).map(tick => parseFloat(tick.textContent));
        return {
          min: Math.min(...values),
          max: Math.max(...values)
        };
      }, chartSelector);
    };

    // Get initial Timeline Y-axis domain
    const initialTimelineDomain = await getYAxisDomain('.timeline-chart');
    console.log('Initial Timeline Y domain:', initialTimelineDomain);

    // Switch to Variability tab
    await page.click('button:has-text("Variability")');
    await page.waitForSelector('.variability-chart', { timeout: 5000 });

    // Get initial Variability Y-axis domain
    const initialVariabilityDomain = await getYAxisDomain('.variability-chart');
    console.log('Initial Variability Y domain:', initialVariabilityDomain);

    // Verify initial domains match (within tolerance for nice() rounding)
    expect(Math.abs(initialTimelineDomain.min - initialVariabilityDomain.min)).toBeLessThan(10);
    expect(Math.abs(initialTimelineDomain.max - initialVariabilityDomain.max)).toBeLessThan(10);

    // Zoom on Variability chart Y-axis
    const variabilityChart = await page.locator('.variability-chart');
    const bbox = await variabilityChart.boundingBox();
    
    // Hover over Y-axis area (left margin)
    await page.mouse.move(bbox.x + 35, bbox.y + bbox.height / 2);
    
    // Zoom in with mouse wheel
    await page.mouse.wheel(0, -240); // Negative for zoom in
    await page.waitForTimeout(500); // Wait for zoom animation

    // Get new Variability domain after zoom
    const zoomedVariabilityDomain = await getYAxisDomain('.variability-chart');
    console.log('Zoomed Variability Y domain:', zoomedVariabilityDomain);

    // Verify zoom happened
    const variabilityRange = zoomedVariabilityDomain.max - zoomedVariabilityDomain.min;
    const initialRange = initialVariabilityDomain.max - initialVariabilityDomain.min;
    expect(variabilityRange).toBeLessThan(initialRange * 0.9); // Should be zoomed in

    // Switch back to Timeline tab
    await page.click('button:has-text("Timeline")');
    await page.waitForSelector('.timeline-chart', { timeout: 5000 });

    // Get Timeline domain after switching back
    const syncedTimelineDomain = await getYAxisDomain('.timeline-chart');
    console.log('Synced Timeline Y domain:', syncedTimelineDomain);

    // Verify Timeline has the same zoomed domain as Variability
    expect(Math.abs(syncedTimelineDomain.min - zoomedVariabilityDomain.min)).toBeLessThan(10);
    expect(Math.abs(syncedTimelineDomain.max - zoomedVariabilityDomain.max)).toBeLessThan(10);

    // Test zoom on Timeline and verify sync to Variability
    const timelineChart = await page.locator('.timeline-chart');
    const timelineBbox = await timelineChart.boundingBox();
    
    // Hover over Timeline Y-axis area
    await page.mouse.move(timelineBbox.x + 35, timelineBbox.y + timelineBbox.height / 2);
    
    // Zoom out
    await page.mouse.wheel(0, 240); // Positive for zoom out
    await page.waitForTimeout(500);

    // Get new Timeline domain
    const zoomedOutTimelineDomain = await getYAxisDomain('.timeline-chart');
    console.log('Zoomed out Timeline Y domain:', zoomedOutTimelineDomain);

    // Switch to Variability and verify sync
    await page.click('button:has-text("Variability")');
    await page.waitForSelector('.variability-chart', { timeout: 5000 });

    const finalVariabilityDomain = await getYAxisDomain('.variability-chart');
    console.log('Final Variability Y domain:', finalVariabilityDomain);

    // Verify final sync
    expect(Math.abs(finalVariabilityDomain.min - zoomedOutTimelineDomain.min)).toBeLessThan(10);
    expect(Math.abs(finalVariabilityDomain.max - zoomedOutTimelineDomain.max)).toBeLessThan(10);
  });

  test('should reset zoom on both charts when reset is clicked', async ({ page }) => {
    // Zoom on Timeline chart
    const timelineChart = await page.locator('.timeline-chart');
    const bbox = await timelineChart.boundingBox();
    
    await page.mouse.move(bbox.x + 35, bbox.y + bbox.height / 2);
    await page.mouse.wheel(0, -240); // Zoom in
    await page.waitForTimeout(500);

    // Look for zoom controls
    const zoomControls = await page.locator('.zoom-controls').first();
    expect(await zoomControls.isVisible()).toBe(true);

    // Click reset zoom
    await page.click('button:has-text("Reset Zoom")');
    await page.waitForTimeout(500);

    // Verify zoom controls indicate 1x zoom
    const zoomText = await page.locator('.zoom-controls').textContent();
    expect(zoomText).toContain('Y: 1.0x');

    // Switch to Variability and verify it's also reset
    await page.click('button:has-text("Variability")');
    await page.waitForSelector('.variability-chart', { timeout: 5000 });

    // Zoom controls should not be visible or should show 1x
    const variabilityZoomText = await page.locator('.zoom-controls').textContent();
    expect(variabilityZoomText).toContain('Y: 1.0x');
  });
});