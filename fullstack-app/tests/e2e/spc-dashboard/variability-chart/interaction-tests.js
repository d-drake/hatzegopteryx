const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Starting Variability Chart Interaction Tests...\n');

  try {
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForLoadState('networkidle');

    // Test 1: Y-axis zoom synchronization
    console.log('Testing Y-axis zoom synchronization...');
    
    // Get initial scale from Timeline
    await page.click('button:has-text("Timeline")');
    await page.waitForTimeout(500);
    
    const initialTimelineScale = await page.evaluate(() => {
      const yAxis = document.querySelector('.timeline-container .axis-left');
      const ticks = Array.from(yAxis.querySelectorAll('.tick text')).map(t => parseFloat(t.textContent));
      return { min: Math.min(...ticks), max: Math.max(...ticks) };
    });

    // Switch to Variability and check scale
    await page.click('button:has-text("Variability")');
    await page.waitForTimeout(500);
    
    const initialVariabilityScale = await page.evaluate(() => {
      const yAxis = document.querySelector('.variability-chart-container .axis-left');
      const ticks = Array.from(yAxis.querySelectorAll('.tick text')).map(t => parseFloat(t.textContent));
      return { min: Math.min(...ticks), max: Math.max(...ticks) };
    });

    console.log(`  Initial scales match: ${
      Math.abs(initialTimelineScale.min - initialVariabilityScale.min) < 0.1 &&
      Math.abs(initialTimelineScale.max - initialVariabilityScale.max) < 0.1
    }`);

    // Zoom on Variability chart Y-axis
    const yAxisBounds = await page.locator('.variability-chart-container .axis-left').boundingBox();
    await page.mouse.move(yAxisBounds.x + 10, yAxisBounds.y + yAxisBounds.height / 2);
    await page.mouse.wheel(0, -100); // Zoom in
    await page.waitForTimeout(500);

    const zoomedVariabilityScale = await page.evaluate(() => {
      const yAxis = document.querySelector('.variability-chart-container .axis-left');
      const ticks = Array.from(yAxis.querySelectorAll('.tick text')).map(t => parseFloat(t.textContent));
      return { min: Math.min(...ticks), max: Math.max(...ticks) };
    });

    // Check Timeline scale updated
    await page.click('button:has-text("Timeline")');
    await page.waitForTimeout(500);
    
    const zoomedTimelineScale = await page.evaluate(() => {
      const yAxis = document.querySelector('.timeline-container .axis-left');
      const ticks = Array.from(yAxis.querySelectorAll('.tick text')).map(t => parseFloat(t.textContent));
      return { min: Math.min(...ticks), max: Math.max(...ticks) };
    });

    console.log(`  Zoom sync Timeline->Variability: ${
      Math.abs(zoomedTimelineScale.min - zoomedVariabilityScale.min) < 0.1 &&
      Math.abs(zoomedTimelineScale.max - zoomedVariabilityScale.max) < 0.1
    }`);

    // Test 2: Zoom persistence across tabs
    console.log('\nTesting zoom persistence across tabs...');
    
    const currentScale = { ...zoomedTimelineScale };
    
    // Switch tabs multiple times
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Variability")');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Timeline")');
      await page.waitForTimeout(300);
    }

    const persistedScale = await page.evaluate(() => {
      const yAxis = document.querySelector('.timeline-container .axis-left');
      const ticks = Array.from(yAxis.querySelectorAll('.tick text')).map(t => parseFloat(t.textContent));
      return { min: Math.min(...ticks), max: Math.max(...ticks) };
    });

    console.log(`  Zoom persisted after tab switches: ${
      Math.abs(currentScale.min - persistedScale.min) < 0.1 &&
      Math.abs(currentScale.max - persistedScale.max) < 0.1
    }`);

    // Test 3: Tooltip functionality
    console.log('\nTesting tooltip functionality...');
    
    await page.click('button:has-text("Variability")');
    await page.waitForTimeout(500);

    // Test box plot tooltip
    const boxPlotTooltip = await page.evaluate(async () => {
      const boxPlot = document.querySelector('[data-entity="FAKE_TOOL1"] .box');
      if (!boxPlot) return null;

      // Simulate hover
      const event = new MouseEvent('mouseenter', { bubbles: true });
      boxPlot.dispatchEvent(event);

      // Wait for tooltip
      await new Promise(resolve => setTimeout(resolve, 100));

      const tooltip = document.querySelector('.tooltip');
      if (!tooltip) return null;

      return {
        visible: tooltip.style.display !== 'none',
        content: tooltip.textContent,
        hasExpectedFields: 
          tooltip.textContent.includes('Entity:') &&
          tooltip.textContent.includes('Count:') &&
          tooltip.textContent.includes('Mean:') &&
          tooltip.textContent.includes('Median:') &&
          tooltip.textContent.includes('Q1:') &&
          tooltip.textContent.includes('Q3:')
      };
    });

    console.log(`  Box plot tooltip shows: ${boxPlotTooltip?.visible}`);
    console.log(`  Contains expected fields: ${boxPlotTooltip?.hasExpectedFields}`);

    // Test data point tooltip
    const pointTooltip = await page.evaluate(async () => {
      const dataPoint = document.querySelector('.data-point:not(.outlier)');
      if (!dataPoint) return null;

      // Simulate hover
      const event = new MouseEvent('mouseenter', { bubbles: true });
      dataPoint.dispatchEvent(event);

      // Wait for tooltip
      await new Promise(resolve => setTimeout(resolve, 100));

      const tooltip = document.querySelector('.tooltip');
      if (!tooltip) return null;

      return {
        visible: tooltip.style.display !== 'none',
        content: tooltip.textContent,
        hasExpectedFields: 
          tooltip.textContent.includes('Entity:') &&
          tooltip.textContent.includes('Value:') &&
          (tooltip.textContent.includes('Lot:') || tooltip.textContent.includes('Date:'))
      };
    });

    console.log(`  Data point tooltip shows: ${pointTooltip?.visible}`);
    console.log(`  Contains expected fields: ${pointTooltip?.hasExpectedFields}`);

    // Test outlier tooltip
    const outlierTooltip = await page.evaluate(async () => {
      const outlier = document.querySelector('.data-point.outlier');
      if (!outlier) return null;

      // Simulate hover
      const event = new MouseEvent('mouseenter', { bubbles: true });
      outlier.dispatchEvent(event);

      // Wait for tooltip
      await new Promise(resolve => setTimeout(resolve, 100));

      const tooltip = document.querySelector('.tooltip');
      if (!tooltip) return null;

      return {
        visible: tooltip.style.display !== 'none',
        content: tooltip.textContent,
        hasOutlierIndicator: tooltip.textContent.includes('Outlier') || 
                            tooltip.classList.contains('outlier-tooltip')
      };
    });

    console.log(`  Outlier tooltip indicates outlier status: ${outlierTooltip?.hasOutlierIndicator}`);

    // Test 4: Hover states
    console.log('\nTesting hover states...');

    const hoverStates = await page.evaluate(async () => {
      const results = {};

      // Test box hover
      const box = document.querySelector('.box');
      if (box) {
        const originalOpacity = window.getComputedStyle(box).opacity;
        box.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 50));
        const hoverOpacity = window.getComputedStyle(box).opacity;
        box.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        
        results.boxHover = {
          original: originalOpacity,
          hover: hoverOpacity,
          changes: originalOpacity !== hoverOpacity
        };
      }

      // Test point hover
      const point = document.querySelector('.data-point');
      if (point) {
        const originalSize = point.getAttribute('r');
        point.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 50));
        const hoverSize = point.getAttribute('r');
        point.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        
        results.pointHover = {
          original: originalSize,
          hover: hoverSize,
          changes: originalSize !== hoverSize
        };
      }

      return results;
    });

    console.log(`  Box hover state changes: ${hoverStates.boxHover?.changes}`);
    console.log(`  Point hover state changes: ${hoverStates.pointHover?.changes}`);

    // Test 5: Cursor changes over interactive areas
    console.log('\nTesting cursor changes...');

    const cursorTests = await page.evaluate(() => {
      const results = {};

      // Check Y-axis cursor
      const yAxis = document.querySelector('.variability-chart-container .axis-left');
      if (yAxis) {
        results.yAxisCursor = window.getComputedStyle(yAxis).cursor;
      }

      // Check data area cursor
      const dataArea = document.querySelector('.variability-chart-container .data-area');
      if (dataArea) {
        results.dataAreaCursor = window.getComputedStyle(dataArea).cursor;
      }

      return results;
    });

    console.log(`  Y-axis cursor for zoom: ${cursorTests.yAxisCursor === 'ns-resize'}`);
    console.log(`  Data area cursor: ${cursorTests.dataAreaCursor}`);

  } catch (error) {
    console.error('Test error:', error);
  }

  console.log('\n=== Interaction Test Summary ===');
  console.log('All interaction tests completed. Check results above for details.');

  await browser.close();
})();