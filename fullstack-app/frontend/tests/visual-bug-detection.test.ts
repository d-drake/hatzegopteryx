import { test, expect } from '@playwright/test';

/**
 * Comprehensive Playwright tests for visual bug detection in SPC Timeline charts
 * 
 * These tests identify and validate fixes for:
 * 1. Missing primary Y-axis label in SPCTimeline
 * 2. Chart label re-rendering bugs during resize
 * 3. Broken primary Y-axis with artifacts
 * 4. Variability chart markers stacked instead of scattered
 * 5. Legend items disappearing at narrow widths
 * 6. Chart height consistency between Timeline and VariabilityChart
 */

test.describe('SPC Timeline Visual Bug Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the SPC dashboard with test data
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Wait for data to load and charts to render
    await page.waitForSelector('[data-testid="timeline-chart"]', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow for chart animations
  });

  test('Primary Y-axis label should be visible and properly positioned', async ({ page }) => {
    // Test for missing primary Y-axis label issue
    const yAxisLabel = page.locator('text[text-anchor="middle"]:has-text("cd_att")').first();
    
    // Verify Y-axis label exists
    await expect(yAxisLabel).toBeVisible();
    
    // Check positioning - should be on the left side, rotated
    const labelBox = await yAxisLabel.boundingBox();
    expect(labelBox).toBeTruthy();
    
    // Y-axis label should be positioned to the left of the chart area
    expect(labelBox!.x).toBeLessThan(100); // Should be in the left margin area
    
    // Should be vertically centered relative to chart height
    expect(labelBox!.y).toBeGreaterThan(200);
    expect(labelBox!.y).toBeLessThan(400);
  });

  test('Primary Y-axis should render without visual artifacts', async ({ page }) => {
    // Test for broken Y-axis artifacts in lower left
    const yAxisTicks = page.locator('g.y-axis .tick line');
    
    // Verify all Y-axis tick lines are properly rendered
    const tickCount = await yAxisTicks.count();
    expect(tickCount).toBeGreaterThan(3); // Should have multiple ticks
    
    // Check that tick lines have proper stroke attributes
    for (let i = 0; i < Math.min(tickCount, 5); i++) {
      const tick = yAxisTicks.nth(i);
      await expect(tick).toHaveAttribute('stroke', /#[\da-fA-F]{6}|black|#000/); // Valid color
      await expect(tick).toHaveAttribute('stroke-width', /[\d.]+/); // Valid width
    }
    
    // Verify Y-axis line is present and properly styled
    const yAxisLine = page.locator('g.y-axis path.domain');
    await expect(yAxisLine).toBeVisible();
    await expect(yAxisLine).toHaveAttribute('stroke', /#[\da-fA-F]{6}|black|#000/);
  });

  test('Chart labels should remain stable during resize operations', async ({ page }) => {
    // Test for chart label re-rendering bugs during resize
    
    // Get initial label positions
    const yAxisLabel = page.locator('text[text-anchor="middle"]:has-text("cd_att")').first();
    const xAxisLabel = page.locator('text[text-anchor="middle"]:has-text("date")').first();
    
    await expect(yAxisLabel).toBeVisible();
    await expect(xAxisLabel).toBeVisible();
    
    const initialYPos = await yAxisLabel.boundingBox();
    const initialXPos = await xAxisLabel.boundingBox();
    
    // Resize viewport to trigger responsive behavior
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    // Verify labels are still visible after resize
    await expect(yAxisLabel).toBeVisible();
    await expect(xAxisLabel).toBeVisible();
    
    // Resize to narrow width
    await page.setViewportSize({ width: 600, height: 800 });
    await page.waitForTimeout(500);
    
    // Labels should still be visible (not duplicated or overlapping)
    const yLabels = page.locator('text:has-text("cd_att")');
    const yLabelCount = await yLabels.count();
    expect(yLabelCount).toBeLessThanOrEqual(2); // Should not have excessive duplicates
    
    // Return to original size
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);
  });

  test('Legend items should remain visible at narrow widths', async ({ page }) => {
    // Test for legend items disappearing at narrow widths
    
    // Start with wide viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    // Count legend items at wide width
    const legendItems = page.locator('[data-testid="legend-item"]');
    const wideWidthCount = await legendItems.count();
    expect(wideWidthCount).toBeGreaterThan(0);
    
    // Gradually reduce width and check legend visibility
    const breakpoints = [1024, 768, 640, 480];
    
    for (const width of breakpoints) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(300);
      
      // Legend should either be visible or replaced with tabs
      const visibleLegend = page.locator('[data-testid="legend-item"]');
      const tabsContainer = page.locator('[data-testid="chart-tabs"]');
      
      const legendCount = await visibleLegend.count();
      const hasTabsContainer = await tabsContainer.count() > 0;
      
      // At narrow widths, should show tabs instead of legend
      if (width < 768) {
        expect(hasTabsContainer || legendCount > 0).toBeTruthy();
      } else {
        // At wider widths, legend should be visible
        expect(legendCount).toBeGreaterThan(0);
      }
    }
  });

  test('Variability chart markers should be scattered, not stacked', async ({ page }) => {
    // Test for variability chart markers being stacked instead of scattered
    
    // Navigate to test layout page for better variability chart access
    await page.goto('/test-spc-layout');
    await page.waitForSelector('[data-testid="variability-chart"]', { timeout: 10000 });
    
    // Get all data points in the variability chart
    const markers = page.locator('[data-testid="variability-chart"] circle, [data-testid="variability-chart"] path');
    const markerCount = await markers.count();
    expect(markerCount).toBeGreaterThan(5); // Should have multiple markers
    
    // Check that markers have different X positions (scattered, not stacked)
    const xPositions = new Set<number>();
    
    for (let i = 0; i < Math.min(markerCount, 10); i++) {
      const marker = markers.nth(i);
      const box = await marker.boundingBox();
      if (box) {
        xPositions.add(Math.round(box.x));
      }
    }
    
    // Should have multiple distinct X positions (not all stacked)
    expect(xPositions.size).toBeGreaterThan(2);
    
    // Verify markers are distributed across the chart width
    const xPositionsArray = Array.from(xPositions).sort((a, b) => a - b);
    const xRange = xPositionsArray[xPositionsArray.length - 1] - xPositionsArray[0];
    expect(xRange).toBeGreaterThan(100); // Should span significant width
  });

  test('Chart heights should be consistent between Timeline and VariabilityChart', async ({ page }) => {
    // Test for consistent chart heights
    
    // Navigate to layout test page
    await page.goto('/test-spc-layout');
    await page.waitForTimeout(2000);
    
    // Get Timeline chart height
    const timelineChart = page.locator('[data-testid="timeline-chart"]').first();
    const timelineBox = await timelineChart.boundingBox();
    expect(timelineBox).toBeTruthy();
    
    // Get VariabilityChart height
    const variabilityChart = page.locator('[data-testid="variability-chart"]').first();
    const variabilityBox = await variabilityChart.boundingBox();
    expect(variabilityBox).toBeTruthy();
    
    // Heights should be within 10px of each other
    const heightDifference = Math.abs(timelineBox!.height - variabilityBox!.height);
    expect(heightDifference).toBeLessThan(10);
    
    // Both charts should have reasonable minimum height
    expect(timelineBox!.height).toBeGreaterThan(400);
    expect(variabilityBox!.height).toBeGreaterThan(400);
  });

  test('Entity selection should work in variability chart', async ({ page }) => {
    // Test that all entities are displayed in box plots
    
    await page.goto('/test-spc-layout');
    await page.waitForSelector('[data-testid="variability-chart"]', { timeout: 10000 });
    
    // Should show multiple entity groups (box plots)
    const boxPlots = page.locator('[data-testid="variability-chart"] g[data-entity]');
    const entityCount = await boxPlots.count();
    expect(entityCount).toBeGreaterThan(1); // Should have multiple entities
    
    // Each entity group should have box plot elements
    for (let i = 0; i < Math.min(entityCount, 3); i++) {
      const entityGroup = boxPlots.nth(i);
      
      // Should have box elements (quartile boxes)
      const boxes = entityGroup.locator('rect');
      expect(await boxes.count()).toBeGreaterThan(0);
      
      // Should have median lines
      const medianLines = entityGroup.locator('line');
      expect(await medianLines.count()).toBeGreaterThan(0);
    }
  });

  test('Zoom functionality should work without breaking axis labels', async ({ page }) => {
    // Test that zoom operations don't break axis rendering
    
    const chartContainer = page.locator('[data-chart-id]').first();
    await expect(chartContainer).toBeVisible();
    
    // Get initial Y-axis label
    const yAxisLabel = page.locator('text:has-text("cd_att")').first();
    await expect(yAxisLabel).toBeVisible();
    
    // Perform zoom operation on Y-axis
    const yAxisArea = page.locator('rect[style*="ns-resize"]').first();
    await yAxisArea.hover();
    
    // Simulate zoom with wheel event
    await page.mouse.wheel(0, -100); // Zoom in
    await page.waitForTimeout(300);
    
    // Y-axis label should still be visible after zoom
    await expect(yAxisLabel).toBeVisible();
    
    // Zoom out
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(300);
    
    // Should still be visible
    await expect(yAxisLabel).toBeVisible();
  });

  test('Chart rendering should be stable across different data sizes', async ({ page }) => {
    // Test chart stability with different filter configurations
    
    const filterButton = page.locator('button:has-text("Apply Filters")');
    
    // Try different entity filters
    const entities = ['FAKE_TOOL1', 'FAKE_TOOL2', 'FAKE_TOOL3'];
    
    for (const entity of entities) {
      // Change entity filter
      const entitySelect = page.locator('select[name="entity"]');
      await entitySelect.selectOption(entity);
      
      if (await filterButton.isVisible()) {
        await filterButton.click();
      }
      
      await page.waitForTimeout(1000);
      
      // Chart should still render properly
      const timelineChart = page.locator('[data-testid="timeline-chart"]');
      await expect(timelineChart).toBeVisible();
      
      // Y-axis label should be present
      const yAxisLabel = page.locator('text:has-text("cd_att")').first();
      await expect(yAxisLabel).toBeVisible();
    }
  });
});

test.describe('Responsive Layout Validation', () => {
  const viewports = [
    { width: 1920, height: 1080, name: 'Desktop Large' },
    { width: 1024, height: 768, name: 'Desktop Small' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 480, height: 800, name: 'Mobile' },
  ];

  for (const viewport of viewports) {
    test(`Chart layout should be functional at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/test-spc-layout');
      await page.waitForTimeout(2000);
      
      // Charts should be visible and properly sized
      const timelineChart = page.locator('[data-testid="timeline-chart"]');
      const variabilityChart = page.locator('[data-testid="variability-chart"]');
      
      if (viewport.width >= 1024) {
        // Desktop: side-by-side layout
        await expect(timelineChart).toBeVisible();
        await expect(variabilityChart).toBeVisible();
        
        const timelineBox = await timelineChart.boundingBox();
        const variabilityBox = await variabilityChart.boundingBox();
        
        // Should be horizontally aligned (side by side)
        if (timelineBox && variabilityBox) {
          expect(Math.abs(timelineBox.y - variabilityBox.y)).toBeLessThan(50);
        }
      } else {
        // Mobile/Tablet: tab layout
        const tabContainer = page.locator('[data-testid="chart-tabs"]');
        const hasTabs = await tabContainer.count() > 0;
        const hasVisibleCharts = (await timelineChart.count() > 0) && (await variabilityChart.count() > 0);
        
        // Should have either tabs or visible charts
        expect(hasTabs || hasVisibleCharts).toBeTruthy();
      }
    });
  }
});