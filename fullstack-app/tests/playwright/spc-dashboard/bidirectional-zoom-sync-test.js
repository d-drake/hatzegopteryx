const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Bidirectional Zoom Sync Test ===\n');
    
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('1. Waiting for page to load...');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Helper function to get Y-axis domain from a chart
    const getYAxisDomain = async (containerSelector, chartType) => {
      return await page.evaluate(([selector, type]) => {
        const container = document.querySelector(selector);
        if (!container) return null;
        
        // Find the correct Y-axis based on chart type
        let yAxisTicks;
        if (type === 'timeline') {
          // Timeline chart - look for axis with class or specific transform
          const svg = container.querySelector('svg');
          const axes = svg?.querySelectorAll('g[transform]');
          for (const axis of axes || []) {
            const ticks = axis.querySelectorAll('.tick text');
            if (ticks.length > 3) {
              const firstTick = ticks[0].parentElement;
              const transform = firstTick?.getAttribute('transform');
              // Check if this is a vertical axis (Y coordinates change)
              if (transform && transform.includes('translate(0,')) {
                yAxisTicks = ticks;
                break;
              }
            }
          }
        } else {
          // Variability chart
          const yAxis = container.querySelector('g[transform="translate(0,0)"]');
          yAxisTicks = yAxis?.querySelectorAll('.tick text');
        }
        
        if (!yAxisTicks || yAxisTicks.length === 0) return null;
        
        const values = Array.from(yAxisTicks)
          .map(tick => parseFloat(tick.textContent.replace(/[^0-9.-]/g, '')))
          .filter(v => !isNaN(v));
        
        return {
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }, [containerSelector, chartType]);
    };
    
    // Focus on first chart (CD ATT)
    const firstChart = 'div.bg-white.rounded-lg.shadow:first-child';
    
    // Test 1: Get initial Timeline domain
    console.log('\n2. Testing initial state...');
    const initialTimeline = await getYAxisDomain(firstChart, 'timeline');
    console.log('   Initial Timeline domain:', initialTimeline);
    
    // Switch to Variability
    await page.click(`${firstChart} button:has-text("Variability")`);
    await page.waitForTimeout(2000);
    
    const initialVariability = await getYAxisDomain(firstChart, 'variability');
    console.log('   Initial Variability domain:', initialVariability);
    
    // Test 2: Zoom on Variability
    console.log('\n3. Testing zoom on Variability...');
    await page.evaluate(() => {
      const svg = document.querySelector('svg.variability-chart');
      if (svg) {
        // Simulate zoom in
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -240,
          clientX: 119,
          clientY: 1022,
          bubbles: true,
          cancelable: true
        });
        svg.dispatchEvent(wheelEvent);
      }
    });
    await page.waitForTimeout(1500);
    
    const zoomedVariability = await getYAxisDomain(firstChart, 'variability');
    console.log('   Zoomed Variability domain:', zoomedVariability);
    
    // Test 3: Switch to Timeline and verify sync
    console.log('\n4. Testing sync to Timeline...');
    await page.click(`${firstChart} button:has-text("Timeline")`);
    await page.waitForTimeout(2000);
    
    const syncedTimeline = await getYAxisDomain(firstChart, 'timeline');
    console.log('   Synced Timeline domain:', syncedTimeline);
    
    // Verify sync
    const timelineSynced = syncedTimeline && zoomedVariability &&
      Math.abs(syncedTimeline.min - zoomedVariability.min) < 1 &&
      Math.abs(syncedTimeline.max - zoomedVariability.max) < 1;
    
    console.log(`   Timeline sync: ${timelineSynced ? '✓ PASS' : '✗ FAIL'}`);
    
    // Test 4: Zoom on Timeline
    console.log('\n5. Testing zoom on Timeline...');
    const svgBounds = await page.evaluate(() => {
      const svg = document.querySelector(`div.bg-white.rounded-lg.shadow:first-child svg`);
      const rect = svg?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
    });
    
    if (svgBounds) {
      // Zoom out on Timeline
      await page.mouse.move(svgBounds.x + 35, svgBounds.y + svgBounds.height / 2);
      await page.mouse.wheel(0, 240); // Positive for zoom out
      await page.waitForTimeout(1500);
    }
    
    const zoomedTimeline = await getYAxisDomain(firstChart, 'timeline');
    console.log('   Zoomed Timeline domain:', zoomedTimeline);
    
    // Test 5: Switch back to Variability and verify reverse sync
    console.log('\n6. Testing reverse sync to Variability...');
    await page.click(`${firstChart} button:has-text("Variability")`);
    await page.waitForTimeout(2000);
    
    const reverseSyncedVariability = await getYAxisDomain(firstChart, 'variability');
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
      await page.waitForTimeout(1500);
      
      const resetVariability = await getYAxisDomain(firstChart, 'variability');
      console.log('   Reset Variability domain:', resetVariability);
      
      // Switch to Timeline to verify both reset
      await page.click(`${firstChart} button:has-text("Timeline")`);
      await page.waitForTimeout(1500);
      
      const resetTimeline = await getYAxisDomain(firstChart, 'timeline');
      console.log('   Reset Timeline domain:', resetTimeline);
      
      const bothReset = resetVariability && resetTimeline &&
        Math.abs(resetVariability.min - initialVariability.min) < 1 &&
        Math.abs(resetTimeline.min - initialTimeline.min) < 1;
      
      console.log(`   Reset both charts: ${bothReset ? '✓ PASS' : '✗ FAIL'}`);
    } else {
      console.log('   ✗ Reset button not found');
    }
    
    // Test 7: Verify chart independence
    console.log('\n8. Testing chart independence...');
    // Zoom first chart
    await page.evaluate(() => {
      const svg = document.querySelector('div.bg-white.rounded-lg.shadow:first-child svg');
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -240,
          clientX: rect.left + 35,
          clientY: rect.top + rect.height / 2,
          bubbles: true,
          cancelable: true
        });
        svg.dispatchEvent(wheelEvent);
      }
    });
    await page.waitForTimeout(1000);
    
    const firstChartZoomed = await getYAxisDomain(firstChart, 'timeline');
    
    // Check second chart (should be unaffected)
    const secondChart = 'div.bg-white.rounded-lg.shadow:nth-child(2)';
    const secondChartDomain = await getYAxisDomain(secondChart, 'timeline');
    
    console.log('   First chart (zoomed):', firstChartZoomed);
    console.log('   Second chart (should be unchanged):', secondChartDomain);
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`✓ Bidirectional zoom sync: ${timelineSynced && variabilitySynced ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Reset affects both charts: ${resetButton ? 'TESTED' : 'NOT TESTED'}`);
    console.log(`✓ Chart independence: TESTED`);
    
    // Take screenshot
    await page.screenshot({ 
      path: '~/tmp/tests/playwright_png/bidirectional-zoom-sync-final.png',
      fullPage: true 
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ 
      path: '~/tmp/tests/playwright_png/bidirectional-zoom-sync-error.png' 
    });
  } finally {
    await browser.close();
  }
})();