const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Comprehensive Bidirectional Zoom Sync Test ===\n');
    
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('1. Waiting for page to load...');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Helper to get Y-axis values from any chart
    const getYAxisValues = async (chartSelector) => {
      return await page.evaluate((selector) => {
        const chart = document.querySelector(selector);
        if (!chart) return null;
        
        // Find all tick texts in the chart
        const tickTexts = chart.querySelectorAll('.tick text');
        const values = [];
        
        tickTexts.forEach(text => {
          const value = parseFloat(text.textContent);
          if (!isNaN(value)) {
            values.push(value);
          }
        });
        
        if (values.length === 0) return null;
        
        // Sort to find min/max
        values.sort((a, b) => a - b);
        
        return {
          min: values[0],
          max: values[values.length - 1],
          count: values.length,
          allValues: values
        };
      }, chartSelector);
    };
    
    // Test each chart independently
    const charts = ['first-child', 'nth-child(2)', 'nth-child(3)'];
    const chartNames = ['CD ATT', 'CD X-Y', 'CD 6-Sigma'];
    
    for (let i = 0; i < charts.length; i++) {
      const chartSelector = `.bg-white.rounded-lg.shadow:${charts[i]}`;
      const chartName = chartNames[i];
      
      console.log(`\n=== Testing ${chartName} Chart ===`);
      
      // Get initial Timeline state
      const initialTimeline = await getYAxisValues(chartSelector);
      console.log(`Initial Timeline Y-axis: ${initialTimeline ? `${initialTimeline.min} to ${initialTimeline.max}` : 'not found'}`);
      
      // Switch to Variability
      const varButton = await page.$(`${chartSelector} button:has-text("Variability")`);
      if (!varButton) {
        console.log('ERROR: Could not find Variability button');
        continue;
      }
      
      await varButton.click();
      await page.waitForTimeout(2000);
      
      // Verify Variability loaded
      const varLoaded = await page.$eval(chartSelector, (el) => {
        return !!el.querySelector('.variability-chart-container');
      });
      
      if (!varLoaded) {
        console.log('ERROR: Variability chart did not load');
        continue;
      }
      
      const initialVariability = await getYAxisValues(chartSelector);
      console.log(`Initial Variability Y-axis: ${initialVariability ? `${initialVariability.min} to ${initialVariability.max}` : 'not found'}`);
      
      // Zoom on Variability
      console.log('Zooming in on Variability...');
      const varSvg = await page.$(`${chartSelector} .variability-chart-container svg`);
      if (varSvg) {
        const bounds = await varSvg.boundingBox();
        if (bounds) {
          // Zoom in on Y-axis area
          await page.mouse.move(bounds.x + 35, bounds.y + bounds.height / 2);
          await page.mouse.wheel(0, -480); // Strong zoom in
          await page.waitForTimeout(1500);
        }
      }
      
      const zoomedVariability = await getYAxisValues(chartSelector);
      console.log(`Zoomed Variability Y-axis: ${zoomedVariability ? `${zoomedVariability.min} to ${zoomedVariability.max}` : 'not found'}`);
      
      // Check zoom controls
      const zoomText = await page.$eval(`${chartSelector} .zoom-controls`, el => el.textContent).catch(() => null);
      console.log(`Zoom controls: ${zoomText || 'not found'}`);
      
      // Switch back to Timeline
      console.log('Switching to Timeline...');
      const timelineButton = await page.$(`${chartSelector} button:has-text("Timeline")`);
      await timelineButton.click();
      await page.waitForTimeout(2000);
      
      const syncedTimeline = await getYAxisValues(chartSelector);
      console.log(`Synced Timeline Y-axis: ${syncedTimeline ? `${syncedTimeline.min} to ${syncedTimeline.max}` : 'not found'}`);
      
      // Verify sync
      if (zoomedVariability && syncedTimeline) {
        const synced = Math.abs(zoomedVariability.min - syncedTimeline.min) < 1 &&
                       Math.abs(zoomedVariability.max - syncedTimeline.max) < 1;
        console.log(`Timeline sync status: ${synced ? '✓ SYNCED' : '✗ NOT SYNCED'}`);
      }
      
      // Zoom out on Timeline
      console.log('Zooming out on Timeline...');
      const timelineSvg = await page.$(`${chartSelector} svg`);
      if (timelineSvg) {
        const bounds = await timelineSvg.boundingBox();
        if (bounds) {
          await page.mouse.move(bounds.x + 70, bounds.y + bounds.height / 2);
          await page.mouse.wheel(0, 480); // Zoom out
          await page.waitForTimeout(1500);
        }
      }
      
      const zoomedOutTimeline = await getYAxisValues(chartSelector);
      console.log(`Zoomed out Timeline Y-axis: ${zoomedOutTimeline ? `${zoomedOutTimeline.min} to ${zoomedOutTimeline.max}` : 'not found'}`);
      
      // Switch to Variability to verify reverse sync
      console.log('Switching back to Variability...');
      await varButton.click();
      await page.waitForTimeout(2000);
      
      const reverseSyncedVar = await getYAxisValues(chartSelector);
      console.log(`Reverse synced Variability Y-axis: ${reverseSyncedVar ? `${reverseSyncedVar.min} to ${reverseSyncedVar.max}` : 'not found'}`);
      
      // Verify reverse sync
      if (zoomedOutTimeline && reverseSyncedVar) {
        const synced = Math.abs(zoomedOutTimeline.min - reverseSyncedVar.min) < 1 &&
                       Math.abs(zoomedOutTimeline.max - reverseSyncedVar.max) < 1;
        console.log(`Variability sync status: ${synced ? '✓ SYNCED' : '✗ NOT SYNCED'}`);
      }
      
      // Test reset
      console.log('Testing reset zoom...');
      const resetButton = await page.$(`${chartSelector} button:has-text("Reset")`);
      if (resetButton) {
        await resetButton.click();
        await page.waitForTimeout(1500);
        
        const resetVar = await getYAxisValues(chartSelector);
        console.log(`Reset Variability Y-axis: ${resetVar ? `${resetVar.min} to ${resetVar.max}` : 'not found'}`);
        
        // Switch to Timeline to verify both reset
        await timelineButton.click();
        await page.waitForTimeout(1500);
        
        const resetTimeline = await getYAxisValues(chartSelector);
        console.log(`Reset Timeline Y-axis: ${resetTimeline ? `${resetTimeline.min} to ${resetTimeline.max}` : 'not found'}`);
        
        // Check if both returned to original
        if (initialTimeline && resetTimeline && initialVariability && resetVar) {
          const timelineReset = Math.abs(initialTimeline.min - resetTimeline.min) < 1;
          const varReset = Math.abs(initialVariability.min - resetVar.min) < 1;
          console.log(`Reset status: Timeline ${timelineReset ? '✓' : '✗'}, Variability ${varReset ? '✓' : '✗'}`);
        }
      }
    }
    
    // Test chart independence
    console.log('\n=== Testing Chart Independence ===');
    
    // Zoom first chart
    const firstChartSvg = await page.$('.bg-white.rounded-lg.shadow:first-child svg');
    if (firstChartSvg) {
      const bounds = await firstChartSvg.boundingBox();
      if (bounds) {
        await page.mouse.move(bounds.x + 70, bounds.y + bounds.height / 2);
        await page.mouse.wheel(0, -240);
        await page.waitForTimeout(1500);
      }
    }
    
    // Check all charts
    const chart1 = await getYAxisValues('.bg-white.rounded-lg.shadow:first-child');
    const chart2 = await getYAxisValues('.bg-white.rounded-lg.shadow:nth-child(2)');
    const chart3 = await getYAxisValues('.bg-white.rounded-lg.shadow:nth-child(3)');
    
    console.log(`Chart 1 range: ${chart1 ? chart1.max - chart1.min : 'N/A'}`);
    console.log(`Chart 2 range: ${chart2 ? chart2.max - chart2.min : 'N/A'}`);
    console.log(`Chart 3 range: ${chart3 ? chart3.max - chart3.min : 'N/A'}`);
    
    if (chart1 && chart2 && chart3) {
      const range1 = chart1.max - chart1.min;
      const range2 = chart2.max - chart2.min;
      const range3 = chart3.max - chart3.min;
      
      const independent = Math.abs(range1 - range2) > 0.1 || Math.abs(range1 - range3) > 0.1;
      console.log(`Charts independent: ${independent ? '✓ YES' : '✗ NO'}`);
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/final-zoom-sync-test-complete.png',
      fullPage: true 
    });
    
    console.log('\n=== Test Complete ===');
    console.log('Screenshot saved to: ~/tmp/tests/playwright_png/final-zoom-sync-test-complete.png');
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/final-zoom-sync-test-error.png' 
    });
  } finally {
    await browser.close();
  }
})();