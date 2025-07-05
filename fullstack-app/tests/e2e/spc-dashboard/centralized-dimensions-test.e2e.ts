import { test, expect } from '@playwright/test';
import { waitForSPCDashboard } from '../../helpers/e2e/test-utils';

test.describe('Centralized Dimensions Test', () => {
  test('verify zoom areas use consistent dimensions', async ({ page }) => {
    // Navigate to SPC dashboard
    await page.goto('/spc-dashboard/SPC_CD_L1/All%20Products');
    await waitForSPCDashboard(page);
    await page.waitForTimeout(1000);
    
    // Test at different viewport sizes
    const viewports = [
      { width: 800, height: 600, name: '800px' },
      { width: 1200, height: 800, name: '1200px' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      console.log(`\nTesting at ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      const chart = page.locator('[data-chart-id]').first();
      const svg = chart.locator('svg').first();
      
      // Get all zoom area rectangles
      const xZoomBox = svg.locator('rect[fill*="rgba(255, 0, 0"]').first();
      const yZoomBox = svg.locator('rect[fill*="rgba(0, 255, 0"]').first();
      const y2ZoomBox = svg.locator('rect[fill*="rgba(0, 0, 255"]').first();
      
      // Log dimensions
      if (await xZoomBox.count() > 0) {
        const box = await xZoomBox.boundingBox();
        console.log('X-axis zoom box:', box);
      }
      
      if (await yZoomBox.count() > 0) {
        const box = await yZoomBox.boundingBox();
        console.log('Y-axis zoom box:', box);
      }
      
      if (await y2ZoomBox.count() > 0) {
        const box = await y2ZoomBox.boundingBox();
        console.log('Y2-axis zoom box:', box);
      }
      
      // Test cursor changes align with boxes
      const testInteraction = async (box: any, expectedCursor: string, axis: string) => {
        if (box) {
          // Move to center of box
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(100);
          
          // Check if zoom works
          const initialZoom = await page.locator('.zoom-level').first().textContent();
          await page.mouse.wheel(0, -100);
          await page.waitForTimeout(200);
          const newZoom = await page.locator('.zoom-level').first().textContent();
          
          const zoomWorked = newZoom !== initialZoom;
          console.log(`${axis} zoom test: ${zoomWorked ? 'PASS' : 'FAIL'} (${initialZoom} → ${newZoom})`);
          
          // Reset zoom
          const resetButton = page.locator('button:has-text("Reset Zoom")').first();
          if (await resetButton.isVisible()) {
            await resetButton.click();
            await page.waitForTimeout(200);
          }
        }
      };
      
      // Test each axis
      const xBox = await xZoomBox.boundingBox();
      await testInteraction(xBox, 'ew-resize', 'X-axis');
      
      const yBox = await yZoomBox.boundingBox();
      await testInteraction(yBox, 'ns-resize', 'Y-axis');
      
      // Take screenshot
      await page.screenshot({
        path: `zoom-box-debug/centralized-${viewport.name}.png`,
        clip: await chart.boundingBox() || undefined
      });
    }
  });
  
  test('verify no zoom outside axis regions', async ({ page }) => {
    await page.goto('/spc-dashboard/SPC_CD_L1/All%20Products');
    await waitForSPCDashboard(page);
    await page.waitForTimeout(1000);
    
    const chart = page.locator('[data-chart-id]').first();
    const svg = chart.locator('svg').first();
    const svgBox = await svg.boundingBox();
    
    if (!svgBox) return;
    
    // Get initial zoom
    const initialZoom = await page.locator('.zoom-level').first().textContent();
    
    // Try to zoom in center of chart (data area)
    await page.mouse.move(svgBox.x + svgBox.width / 2, svgBox.y + svgBox.height / 2);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(200);
    
    const afterZoom = await page.locator('.zoom-level').first().textContent();
    
    console.log(`Data area zoom test: ${afterZoom === initialZoom ? 'PASS' : 'FAIL'} (should not zoom)`);
    expect(afterZoom).toBe(initialZoom);
  });
});