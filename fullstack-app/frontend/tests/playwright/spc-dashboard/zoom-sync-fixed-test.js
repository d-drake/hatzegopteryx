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
    
    // Find the first chart container (CD ATT vs Date)
    console.log('Finding CD ATT chart container...');
    const chartContainers = await page.$$('div.bg-white.rounded-lg.shadow');
    console.log(`Found ${chartContainers.length} chart containers`);
    
    if (chartContainers.length === 0) {
      throw new Error('No chart containers found');
    }
    
    // Focus on the first chart (CD ATT)
    const firstChartContainer = chartContainers[0];
    
    // Helper to get Y-axis domain from a specific container
    const getYAxisDomainFromContainer = async (container) => {
      return await container.evaluate((el) => {
        // Find the SVG within this container
        const svg = el.querySelector('svg');
        if (!svg) return null;
        
        // Look for Y-axis by finding vertical axis (not horizontal)
        // Y-axis has transform like "translate(0,0)" while X-axis has "translate(0,HEIGHT)"
        const allAxes = svg.querySelectorAll('g[class*="axis"]');
        let yAxis = null;
        
        for (const axis of allAxes) {
          const transform = axis.getAttribute('transform');
          if (transform && (transform === 'translate(0,0)' || !transform.includes(','))) {
            // This is likely the Y-axis
            yAxis = axis;
            break;
          }
        }
        
        if (!yAxis) {
          // Try another approach - look for axis with vertical ticks
          const axisGroups = svg.querySelectorAll('g');
          for (const g of axisGroups) {
            const ticks = g.querySelectorAll('.tick');
            if (ticks.length > 2) {
              // Check if ticks are arranged vertically
              const firstTick = ticks[0];
              const lastTick = ticks[ticks.length - 1];
              const firstTransform = firstTick.getAttribute('transform');
              const lastTransform = lastTick.getAttribute('transform');
              
              if (firstTransform && lastTransform) {
                // Extract Y coordinates
                const firstY = parseFloat(firstTransform.match(/translate\([^,]+,([^)]+)\)/)?.[1] || '0');
                const lastY = parseFloat(lastTransform.match(/translate\([^,]+,([^)]+)\)/)?.[1] || '0');
                
                // If Y coordinates are different, this is a vertical axis
                if (Math.abs(firstY - lastY) > 10) {
                  yAxis = g;
                  break;
                }
              }
            }
          }
        }
        
        if (!yAxis) return null;
        
        const ticks = yAxis.querySelectorAll('.tick text');
        const values = Array.from(ticks)
          .map(tick => parseFloat(tick.textContent.replace(/,/g, '')))
          .filter(v => !isNaN(v));
        
        if (values.length === 0) return null;
        
        return {
          min: Math.min(...values),
          max: Math.max(...values),
          tickCount: values.length,
          values: values
        };
      });
    };
    
    // Get initial Timeline domain from first chart
    console.log('Getting initial Timeline Y-axis domain...');
    let initialTimelineDomain = await getYAxisDomainFromContainer(firstChartContainer);
    console.log('Initial Timeline Y domain:', initialTimelineDomain);
    
    // If null, try to debug what we can see
    if (!initialTimelineDomain) {
      const debugInfo = await firstChartContainer.evaluate((el) => {
        const svg = el.querySelector('svg');
        const axes = svg ? svg.querySelectorAll('g[class*="axis"], g[transform]') : [];
        return {
          svgFound: !!svg,
          axesCount: axes.length,
          axesInfo: Array.from(axes).map(axis => ({
            className: axis.className.baseVal || axis.className,
            transform: axis.getAttribute('transform'),
            tickCount: axis.querySelectorAll('.tick').length
          }))
        };
      });
      console.log('Debug - axes info:', JSON.stringify(debugInfo, null, 2));
    }
    
    // Find and click Variability tab within the first chart container
    console.log('\nSwitching to Variability tab...');
    const variabilityTab = await firstChartContainer.$('button:has-text("Variability")');
    if (!variabilityTab) {
      throw new Error('Variability tab not found in first chart container');
    }
    await variabilityTab.click();
    await page.waitForTimeout(2000);
    
    // Get Variability chart domain
    const initialVariabilityDomain = await getYAxisDomainFromContainer(firstChartContainer);
    console.log('Initial Variability Y domain:', initialVariabilityDomain);
    
    // Compare domains
    if (initialTimelineDomain && initialVariabilityDomain) {
      const domainMatch = 
        Math.abs(initialTimelineDomain.min - initialVariabilityDomain.min) < 1 &&
        Math.abs(initialTimelineDomain.max - initialVariabilityDomain.max) < 1;
      
      console.log(`\nInitial domains match: ${domainMatch ? '✓' : '✗'}`);
      console.log(`  Timeline: ${initialTimelineDomain.min} to ${initialTimelineDomain.max}`);
      console.log(`  Variability: ${initialVariabilityDomain.min} to ${initialVariabilityDomain.max}`);
    }
    
    // Test zoom on Variability chart
    console.log('\nTesting zoom on Variability chart...');
    
    // Get the chart area boundaries
    const chartBounds = await firstChartContainer.evaluate((el) => {
      const svg = el.querySelector('svg');
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const containerRect = el.getBoundingClientRect();
      return {
        svg: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        container: { x: containerRect.x, y: containerRect.y },
        relative: { x: rect.x - containerRect.x, y: rect.y - containerRect.y }
      };
    });
    console.log('Chart bounds:', chartBounds);
    
    // Move to Y-axis area (left margin of SVG)
    const yAxisX = chartBounds.svg.x + 35;
    const yAxisY = chartBounds.svg.y + chartBounds.svg.height / 2;
    console.log(`Moving mouse to Y-axis area: ${yAxisX}, ${yAxisY}`);
    await page.mouse.move(yAxisX, yAxisY);
    await page.waitForTimeout(500);
    
    // Zoom in
    console.log('Performing zoom in...');
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(1500);
    
    // Get zoomed domain
    const zoomedVariabilityDomain = await getYAxisDomainFromContainer(firstChartContainer);
    console.log('Zoomed Variability Y domain:', zoomedVariabilityDomain);
    
    // Check if zoom worked
    if (initialVariabilityDomain && zoomedVariabilityDomain) {
      const initialRange = initialVariabilityDomain.max - initialVariabilityDomain.min;
      const zoomedRange = zoomedVariabilityDomain.max - zoomedVariabilityDomain.min;
      const zoomWorked = zoomedRange < initialRange * 0.9;
      
      console.log(`\nZoom ${zoomWorked ? 'worked ✓' : 'failed ✗'}`);
      console.log(`  Initial range: ${initialRange}`);
      console.log(`  Zoomed range: ${zoomedRange}`);
    }
    
    // Switch back to Timeline
    console.log('\nSwitching back to Timeline tab...');
    const timelineTab = await firstChartContainer.$('button:has-text("Timeline")');
    await timelineTab.click();
    await page.waitForTimeout(2000);
    
    // Check if Timeline is synced
    const syncedTimelineDomain = await getYAxisDomainFromContainer(firstChartContainer);
    console.log('Timeline Y domain after sync:', syncedTimelineDomain);
    
    if (zoomedVariabilityDomain && syncedTimelineDomain) {
      const syncMatch = 
        Math.abs(syncedTimelineDomain.min - zoomedVariabilityDomain.min) < 1 &&
        Math.abs(syncedTimelineDomain.max - zoomedVariabilityDomain.max) < 1;
      
      console.log(`\nSync ${syncMatch ? 'successful ✓' : 'failed ✗'}`);
      if (!syncMatch) {
        console.log(`  Timeline: ${syncedTimelineDomain.min} to ${syncedTimelineDomain.max}`);
        console.log(`  Expected (from Variability): ${zoomedVariabilityDomain.min} to ${zoomedVariabilityDomain.max}`);
      }
    }
    
    // Take screenshots
    await firstChartContainer.screenshot({ path: '~/tmp/tests/playwright_png/chart-container-final.png' });
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: '~/tmp/tests/playwright_png/fixed-test-error.png' });
  } finally {
    await browser.close();
  }
})();