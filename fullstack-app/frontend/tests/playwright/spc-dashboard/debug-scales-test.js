const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('Waiting for charts to load...');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for data
    
    // Debug: Check if data is being loaded properly
    const debugInfo = await page.evaluate(() => {
      // Try to find React component data
      const chartContainers = document.querySelectorAll('[class*="chart"]');
      const info = {
        chartsFound: chartContainers.length,
        chartTypes: [],
        svgInfo: []
      };
      
      chartContainers.forEach((container, index) => {
        const svg = container.querySelector('svg');
        if (svg) {
          const gElements = svg.querySelectorAll('g');
          const circles = svg.querySelectorAll('circle');
          const rects = svg.querySelectorAll('rect');
          const paths = svg.querySelectorAll('path');
          
          info.svgInfo.push({
            index,
            className: container.className,
            svgWidth: svg.getAttribute('width'),
            svgHeight: svg.getAttribute('height'),
            gCount: gElements.length,
            circleCount: circles.length,
            rectCount: rects.length,
            pathCount: paths.length
          });
        }
        
        // Check for specific chart type markers
        if (container.className.includes('timeline')) {
          info.chartTypes.push('Timeline');
        } else if (container.className.includes('variability')) {
          info.chartTypes.push('Variability');
        }
      });
      
      // Check for zoom controls
      const zoomControls = document.querySelector('.zoom-controls');
      info.zoomControlsFound = !!zoomControls;
      
      // Check data in Timeline
      const timelineCircles = document.querySelectorAll('circle[r="4"]');
      info.timelineDataPoints = timelineCircles.length;
      
      return info;
    });
    
    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
    
    // Check if SPCChartWithSharedData is working
    const checkDataFlow = await page.evaluate(() => {
      // Look for loading indicators or error messages
      const loadingElements = document.querySelectorAll('[class*="loading"]');
      const errorElements = document.querySelectorAll('[class*="error"]');
      
      return {
        loadingFound: loadingElements.length,
        errorsFound: errorElements.length,
        tabButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent),
        activeTab: document.querySelector('button[class*="text-blue"]')?.textContent
      };
    });
    
    console.log('Data flow check:', JSON.stringify(checkDataFlow, null, 2));
    
    // Try to get actual data values from the chart
    const dataValues = await page.evaluate(() => {
      const yAxisTicks = document.querySelectorAll('g[class*="axis"] g.tick text');
      const values = [];
      
      yAxisTicks.forEach(tick => {
        const transform = tick.parentElement.getAttribute('transform');
        if (transform && transform.includes('translate(0,')) {
          const text = tick.textContent;
          if (text && !isNaN(parseFloat(text))) {
            values.push({
              text,
              value: parseFloat(text),
              transform
            });
          }
        }
      });
      
      return values;
    });
    
    console.log('Y-axis values:', JSON.stringify(dataValues, null, 2));
    
    // Check if external scale is being passed
    const checkScaleSync = await page.evaluate(() => {
      // This is a bit hacky but we can check if both charts have the same domain
      const allYAxisGroups = document.querySelectorAll('g[class*="axis"]');
      const domains = [];
      
      allYAxisGroups.forEach(axis => {
        const ticks = axis.querySelectorAll('.tick text');
        const tickValues = Array.from(ticks)
          .map(t => parseFloat(t.textContent))
          .filter(v => !isNaN(v));
        
        if (tickValues.length > 0) {
          domains.push({
            min: Math.min(...tickValues),
            max: Math.max(...tickValues),
            tickCount: tickValues.length
          });
        }
      });
      
      return domains;
    });
    
    console.log('All Y-axis domains found:', JSON.stringify(checkScaleSync, null, 2));
    
    // Switch to Variability tab and check again
    console.log('\nSwitching to Variability tab...');
    const variabilityButton = await page.$('button:has-text("Variability")');
    if (variabilityButton) {
      await variabilityButton.click();
      await page.waitForTimeout(2000);
      
      const variabilityData = await page.evaluate(() => {
        const boxPlots = document.querySelectorAll('.box-plot');
        const dataPoints = document.querySelectorAll('.data-point');
        
        return {
          boxPlotCount: boxPlots.length,
          dataPointCount: dataPoints.length,
          entities: Array.from(boxPlots).map(bp => bp.getAttribute('data-entity'))
        };
      });
      
      console.log('Variability chart data:', JSON.stringify(variabilityData, null, 2));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();