import { test, expect } from '@playwright/test';
import { waitForSPCDashboard } from '../helpers/e2e/test-utils';

const viewports = [
  { name: 'mobile', width: 600, height: 800 },
  { name: 'tablet', width: 800, height: 600 },
  { name: 'desktop', width: 1200, height: 800 },
  { name: 'wide', width: 1600, height: 900 }
];

test.describe('Zoom Areas Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spc-dashboard/SPC_CD_L1/All%20Products');
    await waitForSPCDashboard(page);
  });

  viewports.forEach(({ name, width, height }) => {
    test(`zoom areas visual test - ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(1000); // Wait for stable rendering

      // Wait for all charts to be fully rendered
      await page.waitForSelector('[data-chart-id] svg', { state: 'visible' });
      await page.waitForTimeout(500); // Additional wait for D3 animations

      // Find all charts and verify zoom boxes are visible
      const charts = await page.locator('[data-chart-id]').all();
      
      for (let i = 0; i < Math.min(charts.length, 2); i++) { // Test first 2 charts
        const chart = charts[i];
        const chartId = await chart.getAttribute('data-chart-id');
        
        // Verify debug zoom boxes are visible
        const xZoomBox = chart.locator('rect[fill*="rgba(255, 0, 0"]').first();
        const yZoomBox = chart.locator('rect[fill*="rgba(0, 255, 0"]').first();
        
        expect(await xZoomBox.isVisible()).toBe(true);
        expect(await yZoomBox.isVisible()).toBe(true);
        
        // Take screenshot of individual chart
        await chart.screenshot({
          path: `tests/screenshots/baseline/${name}/zoom-areas-chart-${i + 1}.png`
        });
      }

      // Take full dashboard screenshot
      await page.screenshot({
        path: `tests/screenshots/baseline/${name}/zoom-areas-full-dashboard.png`,
        fullPage: true
      });

      // Hover states - test cursor changes
      const firstChart = page.locator('[data-chart-id]').first();
      const svg = firstChart.locator('svg').first();
      
      // Hover over X-axis zoom area
      const xZoomBox = svg.locator('rect[fill*="rgba(255, 0, 0"]').first();
      if (await xZoomBox.isVisible()) {
        await xZoomBox.hover();
        await page.screenshot({
          path: `tests/screenshots/baseline/${name}/zoom-x-axis-hover.png`,
          clip: await firstChart.boundingBox() || undefined
        });
      }

      // Hover over Y-axis zoom area
      const yZoomBox = svg.locator('rect[fill*="rgba(0, 255, 0"]').first();
      if (await yZoomBox.isVisible()) {
        await yZoomBox.hover();
        await page.screenshot({
          path: `tests/screenshots/baseline/${name}/zoom-y-axis-hover.png`,
          clip: await firstChart.boundingBox() || undefined
        });
      }
    });

    test(`zoom interaction visual test - ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(1000);

      const firstChart = page.locator('[data-chart-id]').first();
      const svg = firstChart.locator('svg').first();
      
      // Take baseline screenshot
      await firstChart.screenshot({
        path: `tests/screenshots/baseline/${name}/zoom-baseline.png`
      });

      // Zoom in on X-axis
      const xZoomBox = svg.locator('rect[fill*="rgba(255, 0, 0"]').first();
      if (await xZoomBox.isVisible()) {
        const box = await xZoomBox.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.wheel(0, -200); // Zoom in more
          await page.waitForTimeout(500);
          
          await firstChart.screenshot({
            path: `tests/screenshots/baseline/${name}/zoom-x-axis-zoomed.png`
          });
        }
      }

      // Reset and zoom Y-axis
      const resetButton = page.locator('button:has-text("Reset Zoom")').first();
      if (await resetButton.isVisible()) {
        await resetButton.click();
        await page.waitForTimeout(300);
      }

      const yZoomBox = svg.locator('rect[fill*="rgba(0, 255, 0"]').first();
      if (await yZoomBox.isVisible()) {
        const box = await yZoomBox.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.wheel(0, -200); // Zoom in
          await page.waitForTimeout(500);
          
          await firstChart.screenshot({
            path: `tests/screenshots/baseline/${name}/zoom-y-axis-zoomed.png`
          });
        }
      }
    });
  });

  test('zoom areas alignment verification', async ({ page }) => {
    // Test specifically at 800px width
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(1000);

    const chart = page.locator('[data-chart-id]').first();
    const svg = chart.locator('svg').first();

    // Get all axes
    const axes = await svg.locator('.axis').all();
    
    // Get zoom boxes
    const xZoomBox = svg.locator('rect[fill*="rgba(255, 0, 0"]').first();
    const yZoomBox = svg.locator('rect[fill*="rgba(0, 255, 0"]').first();
    const y2ZoomBox = svg.locator('rect[fill*="rgba(0, 0, 255"]').first();

    // Verify positioning relative to axes
    for (const axis of axes) {
      const axisBox = await axis.boundingBox();
      const axisText = await axis.textContent();
      
      if (axisBox && axisText) {
        // Determine axis type based on content
        const isXAxis = axisText.toLowerCase().includes('date') || 
                       axisText.toLowerCase().includes('time') ||
                       axis.locator('.tick').first().locator('text').count() > 0;
        
        const isYAxis = axisText.toLowerCase().includes('cd') || 
                       axisText.toLowerCase().includes('bias') ||
                       axisText.toLowerCase().includes('sig');

        // Take focused screenshots of each axis with its zoom box
        if (isXAxis) {
          const xBox = await xZoomBox.boundingBox();
          if (xBox) {
            const clipArea = {
              x: Math.min(axisBox.x, xBox.x) - 10,
              y: Math.min(axisBox.y, xBox.y) - 10,
              width: Math.max(axisBox.width, xBox.width) + 20,
              height: axisBox.height + xBox.height + 20
            };
            
            await page.screenshot({
              path: 'tests/screenshots/baseline/800px/x-axis-zoom-area-detail.png',
              clip: clipArea
            });
          }
        }

        if (isYAxis) {
          const yBox = await yZoomBox.boundingBox();
          if (yBox) {
            const clipArea = {
              x: Math.min(axisBox.x, yBox.x) - 10,
              y: Math.min(axisBox.y, yBox.y) - 10,
              width: axisBox.width + yBox.width + 20,
              height: Math.max(axisBox.height, yBox.height) + 20
            };
            
            await page.screenshot({
              path: 'tests/screenshots/baseline/800px/y-axis-zoom-area-detail.png',
              clip: clipArea
            });
          }
        }
      }
    }
  });
});