import { test, expect } from '@playwright/test';

test.describe('Responsive SVG and Legend Layout', () => {
  test.describe('Wide SVG (≥800px width)', () => {
    test('displays legends beside chart on desktop', async ({ page }) => {
      // Set a wide viewport
      await page.setViewportSize({ width: 1400, height: 900 });
      await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      // Find a chart container
      const chartContainer = page.locator('.chart-container').first();
      await expect(chartContainer).toBeVisible();
      
      // Check that legends are present within the SVG
      const svg = chartContainer.locator('svg').first();
      const legendsInSvg = svg.locator('g[class*="legend"]');
      const legendCount = await legendsInSvg.count();
      
      // Should have legends inside the SVG for wide displays
      expect(legendCount).toBeGreaterThan(0);
      
      // Verify MultiColumnLegend is being used
      const multiColumnLegend = svg.locator('text').filter({ hasText: /bias|fake_property/i });
      await expect(multiColumnLegend.first()).toBeVisible();
    });

    test('uses multi-column layout for many legend items', async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 900 });
      await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      // Check for multiple columns in legend
      const svg = page.locator('svg').first();
      const legendGroups = svg.locator('g[transform*="translate"]').filter({ 
        has: page.locator('text').filter({ hasText: /FAKE_TOOL|bias/i })
      });
      
      // Get x-coordinates of legend items to verify multi-column layout
      const xCoordinates = await legendGroups.evaluateAll(elements => 
        elements.map(el => {
          const transform = el.getAttribute('transform') || '';
          const match = transform.match(/translate\((\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
      );
      
      // Should have multiple distinct x-coordinates (columns)
      const uniqueX = [...new Set(xCoordinates)];
      expect(uniqueX.length).toBeGreaterThan(1);
    });
  });

  test.describe('Narrow SVG (<800px width)', () => {
    test('displays legends below chart on narrow screens', async ({ page }) => {
      // Set a narrow viewport
      await page.setViewportSize({ width: 600, height: 900 });
      await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      // Find chart container
      const chartContainer = page.locator('.chart-container').first();
      await expect(chartContainer).toBeVisible();
      
      // Look for legends outside/below the main chart SVG
      const legendsBelow = chartContainer.locator('.legend-container, div[class*="legend"]');
      const legendCount = await legendsBelow.count();
      
      // Should have separate legend containers below chart
      expect(legendCount).toBeGreaterThan(0);
      
      // Verify legend is below the chart area
      const chartBox = await chartContainer.locator('svg').first().boundingBox();
      const legendBox = await legendsBelow.first().boundingBox();
      
      if (chartBox && legendBox) {
        // Legend should be below chart (higher y coordinate)
        expect(legendBox.y).toBeGreaterThan(chartBox.y + chartBox.height - 50);
      }
    });

    test('legends stack vertically on narrow screens', async ({ page }) => {
      await page.setViewportSize({ width: 400, height: 900 });
      await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      const legendContainers = page.locator('.legend-container, div[class*="legend"]');
      const count = await legendContainers.count();
      
      if (count > 1) {
        // Get positions of legend containers
        const positions = await legendContainers.evaluateAll(elements => 
          elements.map(el => el.getBoundingClientRect())
        );
        
        // Verify they are stacked vertically
        for (let i = 1; i < positions.length; i++) {
          expect(positions[i].y).toBeGreaterThan(positions[i-1].y);
        }
      }
    });
  });

  test.describe('Dynamic resizing', () => {
    test('legend layout adapts when browser is resized', async ({ page }) => {
      await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      // Start with wide viewport
      await page.setViewportSize({ width: 1200, height: 900 });
      await page.waitForTimeout(500);
      
      // Check legends are inside SVG
      const svgLegendsWide = await page.locator('svg g[class*="legend"]').count();
      expect(svgLegendsWide).toBeGreaterThan(0);
      
      // Resize to narrow viewport
      await page.setViewportSize({ width: 600, height: 900 });
      await page.waitForTimeout(500);
      
      // Check legends moved outside SVG
      const legendsBelow = await page.locator('.legend-container, div[class*="legend"]').count();
      expect(legendsBelow).toBeGreaterThan(0);
    });
  });

  test('responsive chart wrapper maintains aspect ratio', async ({ page }) => {
    const viewportSizes = [
      { width: 1400, height: 900 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 }
    ];
    
    for (const size of viewportSizes) {
      await page.setViewportSize(size);
      await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('text=/Loading data.../i', { state: 'hidden' });
      
      const chartWrapper = page.locator('[class*="responsive"]').first();
      const wrapperBox = await chartWrapper.boundingBox();
      
      if (wrapperBox) {
        // Check that wrapper maintains reasonable proportions
        const aspectRatio = wrapperBox.width / wrapperBox.height;
        expect(aspectRatio).toBeGreaterThan(1); // Should be wider than tall
        expect(aspectRatio).toBeLessThan(4); // But not too wide
      }
    }
  });
});