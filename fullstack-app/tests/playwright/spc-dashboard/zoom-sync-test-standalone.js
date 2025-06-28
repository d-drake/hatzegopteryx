const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('Waiting for Timeline chart to load...');
    // Wait for Timeline chart to load
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for data and animations
    
    // Helper function to get Y-axis domain from chart
    const getYAxisDomain = async (chartSelector) => {
      return await page.evaluate((selector) => {
        const chart = document.querySelector(selector);
        if (!chart) return null;
        
        // Find Y-axis ticks to determine domain
        const ticks = chart.querySelectorAll('g[transform*="translate(0,"] text');
        const values = Array.from(ticks)
          .map(tick => parseFloat(tick.textContent))
          .filter(v => !isNaN(v));
        
        if (values.length === 0) return null;
        
        return {
          min: Math.min(...values),
          max: Math.max(...values),
          tickCount: values.length
        };
      }, chartSelector);
    };
    
    // Get initial Timeline Y-axis domain
    console.log('Getting initial Timeline Y-axis domain...');
    const initialTimelineDomain = await getYAxisDomain('svg');
    console.log('Initial Timeline Y domain:', initialTimelineDomain);
    
    // Switch to Variability tab
    console.log('Switching to Variability tab...');
    await page.click('button:has-text("Variability")');
    await page.waitForTimeout(2000); // Wait for chart to render
    
    // Get initial Variability Y-axis domain
    console.log('Getting initial Variability Y-axis domain...');
    const initialVariabilityDomain = await getYAxisDomain('svg');
    console.log('Initial Variability Y domain:', initialVariabilityDomain);
    
    // Compare initial domains
    if (initialTimelineDomain && initialVariabilityDomain) {
      const domainDiff = {
        minDiff: Math.abs(initialTimelineDomain.min - initialVariabilityDomain.min),
        maxDiff: Math.abs(initialTimelineDomain.max - initialVariabilityDomain.max)
      };
      console.log('Initial domain differences:', domainDiff);
      
      if (domainDiff.minDiff < 10 && domainDiff.maxDiff < 10) {
        console.log('✓ Initial Y-axis domains match (within tolerance)');
      } else {
        console.log('✗ Initial Y-axis domains DO NOT match');
      }
    }
    
    // Test zoom on Variability chart
    console.log('\nTesting zoom on Variability chart...');
    const svgElement = await page.$('svg');
    const bbox = await svgElement.boundingBox();
    
    // Hover over Y-axis area (left margin)
    const yAxisX = bbox.x + 35;
    const yAxisY = bbox.y + bbox.height / 2;
    await page.mouse.move(yAxisX, yAxisY);
    
    // Take screenshot before zoom
    await page.screenshot({ path: '~/tmp/tests/playwright_png/before-zoom-variability.png' });
    
    // Zoom in with mouse wheel (negative for zoom in)
    console.log('Zooming in on Variability Y-axis...');
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(1000); // Wait for zoom animation
    
    // Get zoomed Variability domain
    const zoomedVariabilityDomain = await getYAxisDomain('svg');
    console.log('Zoomed Variability Y domain:', zoomedVariabilityDomain);
    
    // Verify zoom happened
    if (initialVariabilityDomain && zoomedVariabilityDomain) {
      const variabilityRange = zoomedVariabilityDomain.max - zoomedVariabilityDomain.min;
      const initialRange = initialVariabilityDomain.max - initialVariabilityDomain.min;
      
      if (variabilityRange < initialRange * 0.9) {
        console.log('✓ Zoom successful on Variability chart');
      } else {
        console.log('✗ Zoom did not work on Variability chart');
      }
    }
    
    // Switch back to Timeline tab
    console.log('\nSwitching back to Timeline tab...');
    await page.click('button:has-text("Timeline")');
    await page.waitForTimeout(2000);
    
    // Get Timeline domain after switching back
    const syncedTimelineDomain = await getYAxisDomain('svg');
    console.log('Timeline Y domain after switching back:', syncedTimelineDomain);
    
    // Check if Timeline is synced with zoomed Variability
    if (zoomedVariabilityDomain && syncedTimelineDomain) {
      const syncDiff = {
        minDiff: Math.abs(syncedTimelineDomain.min - zoomedVariabilityDomain.min),
        maxDiff: Math.abs(syncedTimelineDomain.max - zoomedVariabilityDomain.max)
      };
      console.log('Sync differences:', syncDiff);
      
      if (syncDiff.minDiff < 10 && syncDiff.maxDiff < 10) {
        console.log('✓ Timeline successfully synced with Variability zoom');
      } else {
        console.log('✗ Timeline NOT synced with Variability zoom');
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: '~/tmp/tests/playwright_png/after-sync-timeline.png' });
    
    // Test zoom reset
    console.log('\nTesting zoom reset...');
    const zoomControls = await page.$('.zoom-controls');
    if (zoomControls) {
      const resetButton = await page.$('button:has-text("Reset Zoom")');
      if (resetButton) {
        await resetButton.click();
        await page.waitForTimeout(1000);
        console.log('✓ Reset zoom button clicked');
        
        // Check if zoom was reset
        const resetDomain = await getYAxisDomain('svg');
        console.log('Timeline Y domain after reset:', resetDomain);
      } else {
        console.log('✗ Reset zoom button not found');
      }
    } else {
      console.log('✗ Zoom controls not found');
    }
    
    console.log('\nTest completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: '~/tmp/tests/playwright_png/error-screenshot.png' });
  } finally {
    await browser.close();
  }
})();