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
        // Find Y-axis within this container
        const yAxis = el.querySelector('g.y-axis, g[class*="axis"]:not([transform*="translate("][transform*=",0)"])');
        if (!yAxis) return null;
        
        const ticks = yAxis.querySelectorAll('.tick text');
        const values = Array.from(ticks)
          .map(tick => parseFloat(tick.textContent))
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
    const initialTimelineDomain = await getYAxisDomainFromContainer(firstChartContainer);
    console.log('Initial Timeline Y domain:', initialTimelineDomain);
    
    // Find and click Variability tab within the first chart container
    console.log('Switching to Variability tab...');
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
      
      console.log(`Initial domains match: ${domainMatch ? '✓' : '✗'}`);
      console.log(`  Timeline: ${initialTimelineDomain.min} to ${initialTimelineDomain.max}`);
      console.log(`  Variability: ${initialVariabilityDomain.min} to ${initialVariabilityDomain.max}`);
    }
    
    // Test zoom on Variability chart
    console.log('\nTesting zoom on Variability chart...');
    const svg = await firstChartContainer.$('svg');
    const bbox = await svg.boundingBox();
    
    // Move to Y-axis area
    await page.mouse.move(bbox.x + 35, bbox.y + bbox.height / 2);
    await page.waitForTimeout(500);
    
    // Check cursor style
    const cursorStyle = await page.evaluate(() => {
      const element = document.elementFromPoint(35, 400);
      return window.getComputedStyle(element).cursor;
    });
    console.log(`Cursor style at Y-axis: ${cursorStyle}`);
    
    // Zoom in
    console.log('Performing zoom...');
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(1000);
    
    // Get zoomed domain
    const zoomedVariabilityDomain = await getYAxisDomainFromContainer(firstChartContainer);
    console.log('Zoomed Variability Y domain:', zoomedVariabilityDomain);
    
    // Check if zoom worked
    if (initialVariabilityDomain && zoomedVariabilityDomain) {
      const initialRange = initialVariabilityDomain.max - initialVariabilityDomain.min;
      const zoomedRange = zoomedVariabilityDomain.max - zoomedVariabilityDomain.min;
      const zoomWorked = zoomedRange < initialRange * 0.9;
      
      console.log(`Zoom ${zoomWorked ? 'worked ✓' : 'failed ✗'}`);
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
      
      console.log(`Sync ${syncMatch ? 'successful ✓' : 'failed ✗'}`);
      console.log(`  Timeline: ${syncedTimelineDomain.min} to ${syncedTimelineDomain.max}`);
      console.log(`  Variability: ${zoomedVariabilityDomain.min} to ${zoomedVariabilityDomain.max}`);
    }
    
    // Check for zoom controls
    const zoomControls = await firstChartContainer.$('.zoom-controls');
    console.log(`\nZoom controls ${zoomControls ? 'found ✓' : 'not found ✗'}`);
    
    if (zoomControls) {
      const zoomText = await zoomControls.textContent();
      console.log(`Zoom controls text: ${zoomText}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: '~/tmp/tests/playwright_png/targeted-test-error.png' });
  } finally {
    await browser.close();
  }
})();