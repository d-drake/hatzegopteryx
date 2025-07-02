import { test, expect } from '@playwright/test';

test.describe('Dynamic Chart Margins', () => {
  test('should have minimal margins on mobile viewport', async ({ page }) => {
    // Navigate to SPC dashboard
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Set mobile viewport (300px width)
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for charts to render
    await page.waitForSelector('svg.chart', { timeout: 10000 });
    
    // Get all chart SVGs
    const charts = await page.locator('svg.chart').all();
    
    for (const chart of charts) {
      // Get the chart's viewBox or dimensions
      const svgElement = await chart.elementHandle();
      if (!svgElement) continue;
      
      // Check if this chart has a right axis (y2Field)
      const rightAxis = await chart.locator('.axis[transform*="translate"]').nth(2).count();
      const hasRightAxis = rightAxis > 0;
      
      // Get the g element that contains the chart content
      const chartContent = await chart.locator('g').first();
      const transformAttr = await chartContent.getAttribute('transform');
      
      if (transformAttr) {
        // Parse the transform to get margins
        const match = transformAttr.match(/translate\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\)/);
        if (match) {
          const leftMargin = parseFloat(match[1]);
          const topMargin = parseFloat(match[2]);
          
          // Check that left margin is minimal (should be dynamically calculated)
          // We expect it to be less than 30px on mobile
          expect(leftMargin).toBeLessThan(30);
          
          // Top margin should remain at 40px (not adjusted)
          expect(topMargin).toBe(40);
        }
      }
      
      // Check that tick labels are visible and not cut off
      const leftAxisLabels = await chart.locator('.axis:not([transform]) .tick text').all();
      for (const label of leftAxisLabels) {
        const isVisible = await label.isVisible();
        expect(isVisible).toBe(true);
      }
      
      // If there's a right axis, check its labels too
      if (hasRightAxis) {
        const rightAxisLabels = await chart.locator('.axis[transform*="translate"]:last-child .tick text').all();
        for (const label of rightAxisLabels) {
          const isVisible = await label.isVisible();
          expect(isVisible).toBe(true);
        }
      }
    }
  });
  
  test('should adjust margins based on tick label width', async ({ page }) => {
    // Navigate to SPC dashboard
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for charts to render and margins to adjust
    await page.waitForSelector('svg.chart', { timeout: 10000 });
    await page.waitForTimeout(1000); // Allow time for dynamic margin calculation
    
    // Get a chart with y2 axis
    const chartWithY2 = await page.locator('svg.chart').filter({ 
      has: page.locator('.axis[transform*="translate"]').nth(2) 
    }).first();
    
    // Measure actual tick label widths
    const leftAxisLabels = await chartWithY2.locator('.axis:not([transform]) .tick text').all();
    let maxLeftLabelWidth = 0;
    
    for (const label of leftAxisLabels) {
      const bbox = await label.boundingBox();
      if (bbox) {
        maxLeftLabelWidth = Math.max(maxLeftLabelWidth, bbox.width);
      }
    }
    
    // Get the chart's transform to check left margin
    const chartContent = await chartWithY2.locator('g').first();
    const transformAttr = await chartContent.getAttribute('transform');
    
    if (transformAttr) {
      const match = transformAttr.match(/translate\((\d+(?:\.\d+)?),/);
      if (match) {
        const leftMargin = parseFloat(match[1]);
        
        // The margin should be approximately the max label width + 5px padding
        // Allow some tolerance for measurement differences
        const expectedMargin = maxLeftLabelWidth + 5;
        expect(leftMargin).toBeGreaterThan(expectedMargin - 10);
        expect(leftMargin).toBeLessThan(expectedMargin + 10);
      }
    }
  });
});