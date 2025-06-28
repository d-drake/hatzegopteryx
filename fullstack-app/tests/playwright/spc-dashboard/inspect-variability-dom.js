const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== Inspecting Variability Chart DOM Structure ===\n');
    
    // Set viewport and navigate
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('Waiting for page to load...');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Click on Variability tab for the first chart
    console.log('\nClicking Variability tab...');
    const firstChartVariabilityTab = await page.$('div.bg-white.rounded-lg.shadow:first-child button:has-text("Variability")');
    if (firstChartVariabilityTab) {
      await firstChartVariabilityTab.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('Could not find Variability tab button');
      return;
    }
    
    // Inspect the DOM structure
    const domInfo = await page.evaluate(() => {
      const firstChart = document.querySelector('div.bg-white.rounded-lg.shadow:first-child');
      if (!firstChart) return { error: 'First chart not found' };
      
      // Get all SVGs in the first chart
      const svgs = firstChart.querySelectorAll('svg');
      const svgInfo = Array.from(svgs).map((svg, index) => ({
        index,
        className: svg.className.baseVal || svg.className || 'no-class',
        width: svg.getAttribute('width'),
        height: svg.getAttribute('height'),
        parentClasses: svg.parentElement?.className || 'no-parent-class',
        hasChartArea: !!svg.querySelector('.chart-area'),
        hasDataArea: !!svg.querySelector('.data-area'),
        hasBoxPlot: !!svg.querySelector('.box-plot'),
        dataChartId: svg.parentElement?.getAttribute('data-chart-id'),
      }));
      
      // Look for specific elements
      const variabilityContainer = firstChart.querySelector('.variability-chart-container');
      const variabilityChart = firstChart.querySelector('.variability-chart');
      const svgWithVariabilityClass = firstChart.querySelector('svg.variability-chart');
      const zoomControls = firstChart.querySelector('.zoom-controls');
      
      // Get axis information
      const axes = firstChart.querySelectorAll('g[transform]');
      const axisInfo = Array.from(axes).filter(axis => {
        const ticks = axis.querySelectorAll('.tick');
        return ticks.length > 0;
      }).map(axis => ({
        transform: axis.getAttribute('transform'),
        tickCount: axis.querySelectorAll('.tick').length,
        hasLabel: !!axis.querySelector('text.axis-label'),
      }));
      
      return {
        svgCount: svgs.length,
        svgInfo,
        variabilityContainer: {
          exists: !!variabilityContainer,
          className: variabilityContainer?.className,
          dataChartId: variabilityContainer?.getAttribute('data-chart-id'),
        },
        variabilityChart: {
          exists: !!variabilityChart,
          tagName: variabilityChart?.tagName,
          className: variabilityChart?.className,
        },
        svgWithVariabilityClass: {
          exists: !!svgWithVariabilityClass,
          width: svgWithVariabilityClass?.getAttribute('width'),
          height: svgWithVariabilityClass?.getAttribute('height'),
        },
        zoomControls: {
          exists: !!zoomControls,
          text: zoomControls?.textContent,
        },
        axisCount: axisInfo.length,
        axes: axisInfo,
      };
    });
    
    console.log('\nDOM Structure:');
    console.log(JSON.stringify(domInfo, null, 2));
    
    // Try different selectors
    console.log('\n\nTrying different selectors:');
    
    const selectors = [
      'svg.variability-chart',
      '.variability-chart',
      '.variability-chart-container svg',
      'div.bg-white.rounded-lg.shadow:first-child svg',
      '[data-chart-id] svg',
      '.chart-area',
      '.data-area',
      '.box-plot',
    ];
    
    for (const selector of selectors) {
      const element = await page.$(`div.bg-white.rounded-lg.shadow:first-child ${selector}`);
      console.log(`${selector}: ${element ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // Get the actual SVG element for zoom testing
    console.log('\n\nAttempting to find and interact with the chart SVG...');
    const chartSvg = await page.$('div.bg-white.rounded-lg.shadow:first-child .variability-chart-container svg');
    if (chartSvg) {
      console.log('Found chart SVG via .variability-chart-container svg selector');
      
      // Get bounds for interaction
      const bounds = await chartSvg.boundingBox();
      console.log('SVG bounds:', bounds);
      
      // Try to zoom
      console.log('\nAttempting zoom on Y-axis area...');
      if (bounds) {
        // Mouse over Y-axis area (left margin)
        await page.mouse.move(bounds.x + 35, bounds.y + bounds.height / 2);
        await page.mouse.wheel(0, -240); // Negative for zoom in
        await page.waitForTimeout(1500);
        
        // Check if zoom controls updated
        const zoomState = await page.evaluate(() => {
          const zoomControls = document.querySelector('.zoom-controls');
          return {
            exists: !!zoomControls,
            text: zoomControls?.textContent || 'not found',
          };
        });
        
        console.log('Zoom controls after interaction:', zoomState);
      }
    }
    
    console.log('\nKeeping browser open for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();