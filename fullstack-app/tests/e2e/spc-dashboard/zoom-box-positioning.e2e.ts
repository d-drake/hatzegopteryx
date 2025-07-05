import { test, expect } from '@playwright/test';
import { waitForSPCDashboard } from '../../helpers/e2e/test-utils';

// Test zoom box positioning at various viewport widths
const viewportSizes = [
  { width: 600, height: 800, name: 'mobile' },
  { width: 800, height: 600, name: 'problematic-800px' },
  { width: 1200, height: 800, name: 'desktop' },
  { width: 1600, height: 900, name: 'wide-desktop' }
];

test.describe('Zoom Box Positioning Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to SPC dashboard with default data
    await page.goto('/spc-dashboard/SPC_CD_L1/All%20Products');
    await waitForSPCDashboard(page);
  });

  viewportSizes.forEach(({ width, height, name }) => {
    test(`zoom boxes align correctly at ${name} viewport (${width}x${height})`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(500); // Wait for resize to complete

      // Find all Timeline chart containers
      const charts = await page.locator('[data-chart-id]').all();
      
      for (let i = 0; i < charts.length; i++) {
        const chart = charts[i];
        const chartId = await chart.getAttribute('data-chart-id');
        
        // Get the SVG element
        const svg = chart.locator('svg').first();
        const svgBox = await svg.boundingBox();
        
        if (!svgBox) continue;

        // Find debug zoom boxes
        const xAxisZoomBox = await svg.locator('rect[fill*="rgba(255, 0, 0"]').first();
        const yAxisZoomBox = await svg.locator('rect[fill*="rgba(0, 255, 0"]').first();
        const y2AxisZoomBox = await svg.locator('rect[fill*="rgba(0, 0, 255"]').first();

        // Verify X-axis zoom box exists and is visible
        if (await xAxisZoomBox.isVisible()) {
          const xBox = await xAxisZoomBox.boundingBox();
          expect(xBox).toBeTruthy();
          
          // X-axis zoom box should be in the bottom margin area
          expect(xBox!.y).toBeGreaterThan(svgBox.y + svgBox.height * 0.8);
          
          // Test cursor change on hover
          await page.mouse.move(xBox!.x + xBox!.width / 2, xBox!.y + xBox!.height / 2);
          const xCursor = await page.evaluate(() => {
            const el = document.elementFromPoint(
              window.mouseX || 0, 
              window.mouseY || 0
            ) as HTMLElement;
            return window.getComputedStyle(el).cursor;
          });
          expect(xCursor).toBe('ew-resize');
        }

        // Verify Y-axis zoom box exists and is visible
        if (await yAxisZoomBox.isVisible()) {
          const yBox = await yAxisZoomBox.boundingBox();
          expect(yBox).toBeTruthy();
          
          // Y-axis zoom box should be in the left margin area
          expect(yBox!.x).toBeLessThan(svgBox.x + svgBox.width * 0.2);
          
          // Test cursor change on hover
          await page.mouse.move(yBox!.x + yBox!.width / 2, yBox!.y + yBox!.height / 2);
          const yCursor = await page.evaluate(() => {
            const el = document.elementFromPoint(
              window.mouseX || 0, 
              window.mouseY || 0
            ) as HTMLElement;
            return window.getComputedStyle(el).cursor;
          });
          expect(yCursor).toBe('ns-resize');
        }

        // Verify Y2-axis zoom box if it exists
        const y2Exists = await y2AxisZoomBox.count() > 0;
        if (y2Exists && await y2AxisZoomBox.isVisible()) {
          const y2Box = await y2AxisZoomBox.boundingBox();
          expect(y2Box).toBeTruthy();
          
          // Y2-axis zoom box should be in the right margin area
          expect(y2Box!.x).toBeGreaterThan(svgBox.x + svgBox.width * 0.8);
          
          // Test cursor change on hover
          await page.mouse.move(y2Box!.x + y2Box!.width / 2, y2Box!.y + y2Box!.height / 2);
          const y2Cursor = await page.evaluate(() => {
            const el = document.elementFromPoint(
              window.mouseX || 0, 
              window.mouseY || 0
            ) as HTMLElement;
            return window.getComputedStyle(el).cursor;
          });
          expect(y2Cursor).toBe('ns-resize');
        }
      }
    });

    test(`zoom functionality works correctly at ${name} viewport`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(500);

      // Get the first chart
      const chart = page.locator('[data-chart-id]').first();
      const svg = chart.locator('svg').first();
      
      // Find zoom boxes
      const xAxisZoomBox = await svg.locator('rect[fill*="rgba(255, 0, 0"]').first();
      const yAxisZoomBox = await svg.locator('rect[fill*="rgba(0, 255, 0"]').first();

      // Get initial zoom levels
      const initialXZoom = await page.locator('.zoom-level').nth(0).textContent();
      const initialYZoom = await page.locator('.zoom-level').nth(1).textContent();

      // Test X-axis zoom
      if (await xAxisZoomBox.isVisible()) {
        const xBox = await xAxisZoomBox.boundingBox();
        if (xBox) {
          await page.mouse.move(xBox.x + xBox.width / 2, xBox.y + xBox.height / 2);
          await page.mouse.wheel(0, -100); // Zoom in
          await page.waitForTimeout(100);
          
          const newXZoom = await page.locator('.zoom-level').nth(0).textContent();
          expect(newXZoom).not.toBe(initialXZoom);
        }
      }

      // Test Y-axis zoom
      if (await yAxisZoomBox.isVisible()) {
        const yBox = await yAxisZoomBox.boundingBox();
        if (yBox) {
          await page.mouse.move(yBox.x + yBox.width / 2, yBox.y + yBox.height / 2);
          await page.mouse.wheel(0, -100); // Zoom in
          await page.waitForTimeout(100);
          
          const newYZoom = await page.locator('.zoom-level').nth(1).textContent();
          expect(newYZoom).not.toBe(initialYZoom);
        }
      }

      // Reset zoom
      const resetButton = page.locator('button:has-text("Reset Zoom")').first();
      if (await resetButton.isVisible()) {
        await resetButton.click();
        await page.waitForTimeout(100);
        
        // Verify zoom levels are reset
        const resetXZoom = await page.locator('.zoom-level').nth(0).textContent();
        const resetYZoom = await page.locator('.zoom-level').nth(1).textContent();
        expect(resetXZoom).toBe('1.0x');
        expect(resetYZoom).toBe('1.0x');
      }
    });
  });

  test('zoom boxes do not overlap with axes or data', async ({ page }) => {
    // Test at the problematic 800px width
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);

    const chart = page.locator('[data-chart-id]').first();
    const svg = chart.locator('svg').first();

    // Get axis elements
    const xAxis = svg.locator('.axis').filter({ hasText: /date|time/i }).first();
    const yAxis = svg.locator('.axis').filter({ hasText: /cd|bias/i }).first();

    // Get zoom boxes
    const xAxisZoomBox = await svg.locator('rect[fill*="rgba(255, 0, 0"]').first();
    const yAxisZoomBox = await svg.locator('rect[fill*="rgba(0, 255, 0"]').first();

    // Verify X-axis zoom box is below the X-axis
    const xAxisBox = await xAxis.boundingBox();
    const xZoomBox = await xAxisZoomBox.boundingBox();
    
    if (xAxisBox && xZoomBox) {
      expect(xZoomBox.y).toBeGreaterThan(xAxisBox.y + xAxisBox.height);
    }

    // Verify Y-axis zoom box is to the left of the Y-axis
    const yAxisBox = await yAxis.boundingBox();
    const yZoomBox = await yAxisZoomBox.boundingBox();
    
    if (yAxisBox && yZoomBox) {
      expect(yZoomBox.x + yZoomBox.width).toBeLessThanOrEqual(yAxisBox.x);
    }
  });

  test('zoom detection does not trigger outside zoom areas', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);

    const chart = page.locator('[data-chart-id]').first();
    const svg = chart.locator('svg').first();
    const svgBox = await svg.boundingBox();
    
    if (!svgBox) return;

    // Get initial zoom levels
    const initialXZoom = await page.locator('.zoom-level').nth(0).textContent();
    const initialYZoom = await page.locator('.zoom-level').nth(1).textContent();

    // Try to zoom in the center of the chart (data area)
    await page.mouse.move(svgBox.x + svgBox.width / 2, svgBox.y + svgBox.height / 2);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(100);

    // Zoom levels should not change
    const afterXZoom = await page.locator('.zoom-level').nth(0).textContent();
    const afterYZoom = await page.locator('.zoom-level').nth(1).textContent();
    
    expect(afterXZoom).toBe(initialXZoom);
    expect(afterYZoom).toBe(initialYZoom);
  });

  test('capture debug screenshots for manual verification', async ({ page }, testInfo) => {
    const screenshotDir = 'zoom-box-debug';
    
    for (const { width, height, name } of viewportSizes) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(1000); // Extra wait for stable rendering

      // Take full page screenshot
      await page.screenshot({
        path: `${screenshotDir}/zoom-boxes-${name}-${width}x${height}.png`,
        fullPage: true
      });

      // Take screenshot of first chart only
      const firstChart = page.locator('[data-chart-id]').first();
      await firstChart.screenshot({
        path: `${screenshotDir}/zoom-boxes-chart-${name}-${width}x${height}.png`
      });

      // Add screenshot to test artifacts
      await testInfo.attach(`zoom-boxes-${name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png'
      });
    }
  });
});

// Store mouse position for cursor tests
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('mousemove', (e) => {
      (window as any).mouseX = e.clientX;
      (window as any).mouseY = e.clientY;
    });
  });
});