const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Starting Variability Chart Layout Tests...\n');

  // Test configurations for different viewport sizes
  const viewportSizes = [
    { width: 320, height: 568, name: 'Mobile' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1024, height: 768, name: 'Desktop' },
    { width: 1440, height: 900, name: 'Large Desktop' },
    { width: 1920, height: 1080, name: 'Full HD' }
  ];

  const results = [];

  try {
    // Navigate to SPC Dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForLoadState('networkidle');
    // Wait for data to load
    await page.waitForSelector('button:has-text("Timeline")', { timeout: 30000 });

    for (const viewport of viewportSizes) {
      console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})...`);
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500); // Allow for re-render

      // Switch to Variability tab
      await page.click('button:has-text("Variability")');
      await page.waitForTimeout(500);

      // Test 1: Verify chart container exists
      const chartContainer = await page.$('.variability-chart-container');
      const containerExists = chartContainer !== null;

      // Test 2: Measure axes dimensions
      let axesDimensions = null;
      if (containerExists) {
        axesDimensions = await page.evaluate(() => {
          const svg = document.querySelector('.variability-chart-container svg');
          if (!svg) return null;

          const leftAxis = svg.querySelector('.axis.axis-left');
          const bottomAxis = svg.querySelector('.axis.axis-bottom');

          return {
            svg: svg.getBoundingClientRect(),
            leftAxis: leftAxis ? leftAxis.getBoundingClientRect() : null,
            bottomAxis: bottomAxis ? bottomAxis.getBoundingClientRect() : null
          };
        });
      }

      // Test 3: Compare with Timeline dimensions
      await page.click('button:has-text("Timeline")');
      await page.waitForTimeout(500);

      const timelineDimensions = await page.evaluate(() => {
        const svg = document.querySelector('.timeline-container svg');
        if (!svg) return null;

        const leftAxis = svg.querySelector('.axis.axis-left');
        const bottomAxis = svg.querySelector('.axis.axis-bottom');

        return {
          leftAxis: leftAxis ? leftAxis.getBoundingClientRect() : null,
          bottomAxis: bottomAxis ? bottomAxis.getBoundingClientRect() : null
        };
      });

      // Test 4: Check for clipping
      await page.click('button:has-text("Variability")');
      await page.waitForTimeout(500);

      const hasClipping = await page.evaluate(() => {
        const container = document.querySelector('.variability-chart-container');
        if (!container) return true;

        const svg = container.querySelector('svg');
        if (!svg) return true;

        // Check if any axis labels are cut off
        const labels = svg.querySelectorAll('.axis text');
        const svgRect = svg.getBoundingClientRect();

        for (const label of labels) {
          const rect = label.getBoundingClientRect();
          if (rect.left < svgRect.left || 
              rect.right > svgRect.right || 
              rect.top < svgRect.top || 
              rect.bottom > svgRect.bottom) {
            return true;
          }
        }
        return false;
      });

      // Test 5: Verify minimum margins between box plots
      const boxPlotSpacing = await page.evaluate(() => {
        const boxPlots = document.querySelectorAll('.box-plot');
        if (boxPlots.length < 2) return null;

        const spacings = [];
        for (let i = 0; i < boxPlots.length - 1; i++) {
          const rect1 = boxPlots[i].getBoundingClientRect();
          const rect2 = boxPlots[i + 1].getBoundingClientRect();
          spacings.push(rect2.left - rect1.right);
        }
        return spacings;
      });

      // Test 6: Check data containment
      const dataOutsideBounds = await page.evaluate(() => {
        const svg = document.querySelector('.variability-chart-container svg');
        if (!svg) return false;

        const clipPath = svg.querySelector('clipPath rect');
        if (!clipPath) return false;

        const clipBounds = {
          x: parseFloat(clipPath.getAttribute('x')),
          y: parseFloat(clipPath.getAttribute('y')),
          width: parseFloat(clipPath.getAttribute('width')),
          height: parseFloat(clipPath.getAttribute('height'))
        };

        const dataPoints = svg.querySelectorAll('.data-point');
        for (const point of dataPoints) {
          const cx = parseFloat(point.getAttribute('cx'));
          const cy = parseFloat(point.getAttribute('cy'));

          if (cx < clipBounds.x || 
              cx > clipBounds.x + clipBounds.width ||
              cy < clipBounds.y || 
              cy > clipBounds.y + clipBounds.height) {
            return true;
          }
        }
        return false;
      });

      results.push({
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        tests: {
          chartExists: containerExists,
          axesDimensionsMatch: axesDimensions && timelineDimensions ? 
            Math.abs(axesDimensions.leftAxis?.height - timelineDimensions.leftAxis?.height) < 2 &&
            Math.abs(axesDimensions.bottomAxis?.width - timelineDimensions.bottomAxis?.width) < 2 : false,
          noClipping: !hasClipping,
          minSpacingMaintained: boxPlotSpacing ? boxPlotSpacing.every(s => s >= 5) : null,
          dataContained: !dataOutsideBounds
        },
        details: {
          axesDimensions,
          timelineDimensions,
          boxPlotSpacing
        }
      });
    }

    // Test 7: Dynamic resize behavior
    console.log('\nTesting dynamic resize...');
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);

    // Gradually resize and check for layout issues
    for (let width = 1200; width >= 400; width -= 100) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(100);

      const layoutIntact = await page.evaluate(() => {
        const svg = document.querySelector('.variability-chart-container svg');
        return svg && !svg.querySelector('.axis text').textContent.includes('...');
      });

      if (!layoutIntact) {
        console.log(`Layout issue detected at width: ${width}px`);
      }
    }

  } catch (error) {
    console.error('Test error:', error);
  }

  // Print results
  console.log('\n=== Layout Test Results ===\n');
  results.forEach(result => {
    console.log(`${result.viewport} (${result.width}x${result.height}):`);
    console.log(`  ✓ Chart exists: ${result.tests.chartExists}`);
    console.log(`  ✓ Axes match Timeline: ${result.tests.axesDimensionsMatch}`);
    console.log(`  ✓ No clipping: ${result.tests.noClipping}`);
    console.log(`  ✓ Min spacing (5px): ${result.tests.minSpacingMaintained}`);
    console.log(`  ✓ Data contained: ${result.tests.dataContained}`);
    
    if (result.details.boxPlotSpacing) {
      console.log(`  Spacings: ${result.details.boxPlotSpacing.map(s => s.toFixed(1)).join(', ')}px`);
    }
    console.log('');
  });

  await browser.close();
})();