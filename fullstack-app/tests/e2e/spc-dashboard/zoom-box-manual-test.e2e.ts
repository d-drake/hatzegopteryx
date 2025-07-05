import { test, expect } from '@playwright/test';
import { waitForSPCDashboard } from '../../helpers/e2e/test-utils';

test.describe('Manual Zoom Box Verification', () => {
  test('verify zoom box alignment and interaction', async ({ page }) => {
    // Navigate to a valid SPC dashboard URL
    await page.goto('/spc-dashboard/SPC_CD_L1/All%20Products');
    await waitForSPCDashboard(page);
    
    // Wait for charts to be fully rendered
    await page.waitForTimeout(1500);
    
    // Find the first chart
    const chart = page.locator('[data-chart-id]').first();
    const svg = chart.locator('svg').first();
    
    // Take a screenshot showing the debug boxes
    await page.screenshot({
      path: 'zoom-box-debug/alignment-test.png',
      fullPage: false,
      clip: await chart.boundingBox() || undefined
    });
    
    // Test cursor changes by hovering over each area
    const testCursor = async (selector: string, expectedCursor: string, description: string) => {
      const element = svg.locator(selector).first();
      if (await element.count() > 0) {
        const box = await element.boundingBox();
        if (box) {
          // Move to center of the box
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(100);
          
          // Get the computed cursor style
          const cursor = await svg.evaluate((el) => {
            return window.getComputedStyle(el).cursor;
          });
          
          console.log(`${description}: cursor = ${cursor} (expected: ${expectedCursor})`);
          
          // Take screenshot while hovering
          await page.screenshot({
            path: `zoom-box-debug/${description.toLowerCase().replace(/\s+/g, '-')}-hover.png`,
            clip: await chart.boundingBox() || undefined
          });
        }
      }
    };
    
    // Test each zoom area
    await testCursor('rect[fill*="rgba(255, 0, 0"]', 'ew-resize', 'X-axis zoom area');
    await testCursor('rect[fill*="rgba(0, 255, 0"]', 'ns-resize', 'Y-axis zoom area');
    await testCursor('rect[fill*="rgba(0, 0, 255"]', 'ns-resize', 'Y2-axis zoom area');
    
    // Test zoom functionality
    const xZoomBox = svg.locator('rect[fill*="rgba(255, 0, 0"]').first();
    const xBox = await xZoomBox.boundingBox();
    
    if (xBox) {
      // Get initial zoom level
      const initialZoom = await page.locator('.zoom-level').first().textContent();
      console.log(`Initial X-axis zoom: ${initialZoom}`);
      
      // Zoom in on X-axis
      await page.mouse.move(xBox.x + xBox.width / 2, xBox.y + xBox.height / 2);
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(200);
      
      // Check new zoom level
      const newZoom = await page.locator('.zoom-level').first().textContent();
      console.log(`New X-axis zoom: ${newZoom}`);
      
      expect(newZoom).not.toBe(initialZoom);
    }
    
    // Test that zooming outside the boxes doesn't work
    const svgBox = await svg.boundingBox();
    if (svgBox) {
      // Reset zoom first
      const resetButton = page.locator('button:has-text("Reset Zoom")').first();
      if (await resetButton.isVisible()) {
        await resetButton.click();
        await page.waitForTimeout(200);
      }
      
      const beforeZoom = await page.locator('.zoom-level').first().textContent();
      
      // Try to zoom in the center of the chart (data area)
      await page.mouse.move(svgBox.x + svgBox.width / 2, svgBox.y + svgBox.height / 2);
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(200);
      
      const afterZoom = await page.locator('.zoom-level').first().textContent();
      console.log(`Zoom in data area - before: ${beforeZoom}, after: ${afterZoom}`);
      
      expect(afterZoom).toBe(beforeZoom);
    }
  });
});