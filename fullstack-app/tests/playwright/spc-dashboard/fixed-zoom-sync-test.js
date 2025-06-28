const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Fixed Bidirectional Zoom Sync Test ===\n');
    
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('1. Waiting for page to load...');
    // Wait for chart containers to be present
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Helper function to get Y-axis domain from Timeline
    const getTimelineYDomain = async (chartIndex) => {
      return await page.evaluate((index) => {
        const charts = document.querySelectorAll('.bg-white.rounded-lg.shadow');
        const chart = charts[index];
        if (!chart) return null;
        
        const svg = chart.querySelector('svg');
        if (!svg) return null;
        
        // Find Y-axis by looking for left-positioned axis
        const axes = svg.querySelectorAll('g[transform]');
        for (const axis of axes) {
          const transform = axis.getAttribute('transform');
          if (transform && transform.includes('translate(0,')) {
            const ticks = axis.querySelectorAll('.tick text');
            if (ticks.length > 3) {
              const values = Array.from(ticks)
                .map(tick => parseFloat(tick.textContent))
                .filter(v => !isNaN(v));
              
              if (values.length > 0) {
                return {
                  min: Math.min(...values),
                  max: Math.max(...values),
                  count: values.length
                };
              }
            }
          }
        }
        return null;
      }, chartIndex);
    };
    
    // Helper function to get Y-axis domain from Variability chart
    const getVariabilityYDomain = async (chartIndex) => {
      return await page.evaluate((index) => {
        const charts = document.querySelectorAll('.bg-white.rounded-lg.shadow');
        const chart = charts[index];
        if (!chart) return null;
        
        const container = chart.querySelector('.variability-chart-container');
        if (!container) return null;
        
        const svg = container.querySelector('svg');
        if (!svg) return null;
        
        // Find Y-axis
        const yAxis = svg.querySelector('g[transform="translate(70,30)"] g[transform="translate(0,0)"]');
        if (!yAxis) {
          // Try alternative selector
          const axes = svg.querySelectorAll('g[transform*="translate"]');
          for (const axis of axes) {
            const ticks = axis.querySelectorAll('.tick text');
            if (ticks.length > 3) {
              const firstTick = ticks[0];
              const parent = firstTick.parentElement.parentElement;
              const transform = parent.getAttribute('transform');
              // Check if this is likely the Y-axis (left positioned)
              if (transform && transform.includes('translate(0,0)')) {
                const values = Array.from(ticks)
                  .map(tick => parseFloat(tick.textContent))
                  .filter(v => !isNaN(v));
                
                if (values.length > 0) {
                  return {
                    min: Math.min(...values),
                    max: Math.max(...values),
                    count: values.length
                  };
                }
              }
            }
          }
        }
        
        return null;
      }, chartIndex);
    };
    
    // Focus on first chart (CD ATT)
    const chartIndex = 0;
    
    // Test 1: Get initial Timeline domain
    console.log('\n2. Testing initial state...');
    const initialTimeline = await getTimelineYDomain(chartIndex);
    console.log('   Initial Timeline domain:', initialTimeline);
    
    // Switch to Variability - use more specific selector
    const variabilityButton = await page.$('.bg-white.rounded-lg.shadow:first-child button:has-text("Variability")');
    if (!variabilityButton) {
      console.log('   ERROR: Could not find Variability button');
      return;
    }
    
    await variabilityButton.click();
    await page.waitForTimeout(3000); // Give more time for component to render
    
    // Verify Variability chart loaded
    const variabilityLoaded = await page.$('.bg-white.rounded-lg.shadow:first-child .variability-chart-container');
    if (!variabilityLoaded) {
      console.log('   ERROR: Variability chart did not load');
      return;
    }
    
    const initialVariability = await getVariabilityYDomain(chartIndex);
    console.log('   Initial Variability domain:', initialVariability);
    
    // Test 2: Zoom on Variability
    console.log('\n3. Testing zoom on Variability...');
    
    // Get the SVG element for the first chart's variability chart
    const svgHandle = await page.$('.bg-white.rounded-lg.shadow:first-child .variability-chart-container svg');
    if (!svgHandle) {
      console.log('   ERROR: Could not find Variability SVG');
      return;
    }
    
    const svgBounds = await svgHandle.boundingBox();
    if (!svgBounds) {
      console.log('   ERROR: Could not get SVG bounds');
      return;
    }
    
    // Zoom in on Y-axis area (left margin area)
    await page.mouse.move(svgBounds.x + 35, svgBounds.y + svgBounds.height / 2);
    await page.mouse.wheel(0, -240); // Negative for zoom in
    await page.waitForTimeout(2000);
    
    const zoomedVariability = await getVariabilityYDomain(chartIndex);
    console.log('   Zoomed Variability domain:', zoomedVariability);
    
    // Verify zoom happened
    if (!zoomedVariability || !initialVariability || 
        Math.abs(zoomedVariability.max - initialVariability.max) < 0.1) {
      console.log('   WARNING: Zoom might not have worked properly');
    }
    
    // Test 3: Switch to Timeline and verify sync
    console.log('\n4. Testing sync to Timeline...');
    const timelineButton = await page.$('.bg-white.rounded-lg.shadow:first-child button:has-text("Timeline")');
    if (!timelineButton) {
      console.log('   ERROR: Could not find Timeline button');
      return;
    }
    
    await timelineButton.click();
    await page.waitForTimeout(2000);
    
    const syncedTimeline = await getTimelineYDomain(chartIndex);
    console.log('   Synced Timeline domain:', syncedTimeline);
    
    // Verify sync
    const timelineSynced = syncedTimeline && zoomedVariability &&
      Math.abs(syncedTimeline.min - zoomedVariability.min) < 1 &&
      Math.abs(syncedTimeline.max - zoomedVariability.max) < 1;
    
    console.log(`   Timeline sync: ${timelineSynced ? '✓ PASS' : '✗ FAIL'}`);
    
    // Test 4: Zoom on Timeline
    console.log('\n5. Testing zoom on Timeline...');
    
    // Get Timeline SVG
    const timelineSvg = await page.$('.bg-white.rounded-lg.shadow:first-child svg');
    const timelineBounds = await timelineSvg.boundingBox();
    
    if (timelineBounds) {
      // Zoom out on Timeline
      await page.mouse.move(timelineBounds.x + 35, timelineBounds.y + timelineBounds.height / 2);
      await page.mouse.wheel(0, 240); // Positive for zoom out
      await page.waitForTimeout(2000);
    }
    
    const zoomedTimeline = await getTimelineYDomain(chartIndex);
    console.log('   Zoomed Timeline domain:', zoomedTimeline);
    
    // Test 5: Switch back to Variability and verify reverse sync
    console.log('\n6. Testing reverse sync to Variability...');
    await variabilityButton.click();
    await page.waitForTimeout(3000);
    
    const reverseSyncedVariability = await getVariabilityYDomain(chartIndex);
    console.log('   Reverse synced Variability domain:', reverseSyncedVariability);
    
    // Verify reverse sync
    const variabilitySynced = reverseSyncedVariability && zoomedTimeline &&
      Math.abs(reverseSyncedVariability.min - zoomedTimeline.min) < 1 &&
      Math.abs(reverseSyncedVariability.max - zoomedTimeline.max) < 1;
    
    console.log(`   Variability sync: ${variabilitySynced ? '✓ PASS' : '✗ FAIL'}`);
    
    // Test 6: Reset zoom
    console.log('\n7. Testing reset zoom...');
    const resetButton = await page.$('button:has-text("Reset Zoom")');
    if (resetButton) {
      await resetButton.click();
      await page.waitForTimeout(2000);
      
      const resetVariability = await getVariabilityYDomain(chartIndex);
      console.log('   Reset Variability domain:', resetVariability);
      
      // Switch to Timeline to verify both reset
      await timelineButton.click();
      await page.waitForTimeout(2000);
      
      const resetTimeline = await getTimelineYDomain(chartIndex);
      console.log('   Reset Timeline domain:', resetTimeline);
      
      const bothReset = resetVariability && resetTimeline && initialVariability && initialTimeline &&
        Math.abs(resetVariability.min - initialVariability.min) < 1 &&
        Math.abs(resetTimeline.min - initialTimeline.min) < 1;
      
      console.log(`   Reset both charts: ${bothReset ? '✓ PASS' : '✗ FAIL'}`)
    } else {
      console.log('   ✗ Reset button not found');
    }
    
    // Test 7: Verify chart independence
    console.log('\n8. Testing chart independence...');
    
    // Zoom first chart
    const firstChartSvg = await page.$('.bg-white.rounded-lg.shadow:nth-child(1) svg');
    const firstBounds = await firstChartSvg.boundingBox();
    
    if (firstBounds) {
      await page.mouse.move(firstBounds.x + 35, firstBounds.y + firstBounds.height / 2);
      await page.mouse.wheel(0, -240);
      await page.waitForTimeout(1500);
    }
    
    const firstChartZoomed = await getTimelineYDomain(0);
    const secondChartDomain = await getTimelineYDomain(1);
    
    console.log('   First chart (zoomed):', firstChartZoomed);
    console.log('   Second chart (should be unchanged):', secondChartDomain);
    
    const chartsIndependent = firstChartZoomed && secondChartDomain &&
      Math.abs(firstChartZoomed.max - firstChartZoomed.min) < 
      Math.abs(secondChartDomain.max - secondChartDomain.min);
    
    console.log(`   Charts independent: ${chartsIndependent ? '✓ PASS' : '✗ FAIL'}`);
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`✓ Bidirectional zoom sync: ${timelineSynced && variabilitySynced ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Reset affects both charts: ${resetButton ? 'TESTED' : 'NOT TESTED'}`);
    console.log(`✓ Chart independence: ${chartsIndependent ? 'PASS' : 'FAIL'}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/fixed-bidirectional-zoom-sync-final.png',
      fullPage: true 
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/fixed-bidirectional-zoom-sync-error.png' 
    });
  } finally {
    await browser.close();
  }
})();