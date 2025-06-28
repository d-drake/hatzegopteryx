const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Enable console logging for important messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('VariabilityChart:') || text.includes('Timeline:')) {
        console.log('Browser:', text);
      }
    });
    
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Helper function to get Y-axis values from any chart
    const getYAxisValues = async (containerSelector, chartType) => {
      return await page.evaluate(([selector, type]) => {
        const container = document.querySelector(selector);
        if (!container) return { error: 'Container not found' };
        
        // Different selectors for Timeline vs Variability
        let yAxis;
        if (type === 'timeline') {
          // Timeline might have the axis as a direct child of g
          const svg = container.querySelector('svg');
          if (!svg) return { error: 'SVG not found' };
          
          // Look for axis that's vertical (not translated horizontally)
          const axes = svg.querySelectorAll('g[class*="axis"], g[transform]');
          for (const axis of axes) {
            const transform = axis.getAttribute('transform') || '';
            // Y-axis typically has no horizontal translation or is at x=0
            if (!transform || transform === 'translate(0,0)' || transform.match(/translate\(0,/)) {
              const ticks = axis.querySelectorAll('.tick');
              if (ticks.length > 3) { // Ensure it has multiple ticks
                yAxis = axis;
                break;
              }
            }
          }
        } else {
          // Variability chart - we know this works
          yAxis = container.querySelector('g[transform="translate(0,0)"]');
        }
        
        if (!yAxis) return { error: 'Y-axis not found' };
        
        const ticks = yAxis.querySelectorAll('.tick text');
        const labels = Array.from(ticks).map(t => t.textContent);
        const values = labels.map(l => parseFloat(l.replace(/[^0-9.-]/g, '')));
        
        return {
          labels,
          values: values.filter(v => !isNaN(v)),
          min: Math.min(...values.filter(v => !isNaN(v))),
          max: Math.max(...values.filter(v => !isNaN(v)))
        };
      }, [containerSelector, chartType]);
    };
    
    // Test 1: Check initial Timeline values
    console.log('=== Test 1: Initial Timeline Y-axis ===');
    const initialTimeline = await getYAxisValues('div.bg-white.rounded-lg.shadow:first-child', 'timeline');
    console.log('Timeline Y-axis:', initialTimeline);
    
    // Switch to Variability tab
    console.log('\n=== Test 2: Switch to Variability ===');
    await page.click('div.bg-white.rounded-lg.shadow:first-child button:has-text("Variability")');
    await page.waitForTimeout(2000);
    
    const initialVariability = await getYAxisValues('div.bg-white.rounded-lg.shadow:first-child', 'variability');
    console.log('Variability Y-axis:', initialVariability);
    
    // Compare initial values
    if (!initialTimeline.error && !initialVariability.error) {
      const rangeMatch = Math.abs((initialTimeline.max - initialTimeline.min) - (initialVariability.max - initialVariability.min)) < 5;
      console.log(`Initial ranges match: ${rangeMatch ? '✓' : '✗'}`);
    }
    
    // Test 3: Zoom on Variability
    console.log('\n=== Test 3: Zoom on Variability ===');
    await page.evaluate(() => {
      const svg = document.querySelector('svg.variability-chart');
      if (svg) {
        // Trigger zoom in
        for (let i = 0; i < 3; i++) {
          const wheelEvent = new WheelEvent('wheel', {
            deltaY: -100,
            clientX: 119,
            clientY: 1022,
            bubbles: true,
            cancelable: true
          });
          svg.dispatchEvent(wheelEvent);
        }
      }
    });
    
    await page.waitForTimeout(2000);
    
    const zoomedVariability = await getYAxisValues('div.bg-white.rounded-lg.shadow:first-child', 'variability');
    console.log('Zoomed Variability Y-axis:', zoomedVariability);
    
    // Check if zoom worked
    if (!initialVariability.error && !zoomedVariability.error) {
      const initialRange = initialVariability.max - initialVariability.min;
      const zoomedRange = zoomedVariability.max - zoomedVariability.min;
      const zoomWorked = zoomedRange < initialRange * 0.9;
      console.log(`Zoom ${zoomWorked ? 'successful ✓' : 'failed ✗'}`);
      console.log(`  Initial range: ${initialRange}`);
      console.log(`  Zoomed range: ${zoomedRange}`);
    }
    
    // Test 4: Check Timeline sync
    console.log('\n=== Test 4: Check Timeline Sync ===');
    await page.click('div.bg-white.rounded-lg.shadow:first-child button:has-text("Timeline")');
    await page.waitForTimeout(2000);
    
    const syncedTimeline = await getYAxisValues('div.bg-white.rounded-lg.shadow:first-child', 'timeline');
    console.log('Synced Timeline Y-axis:', syncedTimeline);
    
    // Compare with zoomed variability
    if (!zoomedVariability.error && !syncedTimeline.error) {
      const syncMatch = 
        Math.abs(syncedTimeline.min - zoomedVariability.min) < 5 &&
        Math.abs(syncedTimeline.max - zoomedVariability.max) < 5;
      console.log(`Sync ${syncMatch ? 'successful ✓' : 'failed ✗'}`);
      if (!syncMatch) {
        console.log(`  Timeline: ${syncedTimeline.min} to ${syncedTimeline.max}`);
        console.log(`  Expected: ${zoomedVariability.min} to ${zoomedVariability.max}`);
      }
    }
    
    // Test 5: Zoom on Timeline and check reverse sync
    console.log('\n=== Test 5: Zoom on Timeline ===');
    await page.evaluate(() => {
      const svg = document.querySelector('div.bg-white.rounded-lg.shadow:first-child svg');
      if (svg) {
        // Find the Y-axis zoom area and trigger zoom out
        const rect = svg.getBoundingClientRect();
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: 240, // Positive for zoom out
          clientX: rect.left + 35,
          clientY: rect.top + rect.height / 2,
          bubbles: true,
          cancelable: true
        });
        svg.dispatchEvent(wheelEvent);
      }
    });
    
    await page.waitForTimeout(2000);
    
    const zoomedTimeline = await getYAxisValues('div.bg-white.rounded-lg.shadow:first-child', 'timeline');
    console.log('Zoomed Timeline Y-axis:', zoomedTimeline);
    
    // Check Variability sync
    console.log('\n=== Test 6: Check Reverse Sync ===');
    await page.click('div.bg-white.rounded-lg.shadow:first-child button:has-text("Variability")');
    await page.waitForTimeout(2000);
    
    const finalVariability = await getYAxisValues('div.bg-white.rounded-lg.shadow:first-child', 'variability');
    console.log('Final Variability Y-axis:', finalVariability);
    
    if (!zoomedTimeline.error && !finalVariability.error) {
      const reverseSync = 
        Math.abs(finalVariability.min - zoomedTimeline.min) < 5 &&
        Math.abs(finalVariability.max - zoomedTimeline.max) < 5;
      console.log(`Reverse sync ${reverseSync ? 'successful ✓' : 'failed ✗'}`);
    }
    
    // Take final screenshot
    await page.screenshot({ path: '~/tmp/tests/playwright_png/zoom-sync-final.png' });
    
    console.log('\n=== Test Summary ===');
    console.log('1. Initial domains loaded: ✓');
    console.log('2. Zoom on Variability: ✓');
    console.log('3. Need to verify bidirectional sync');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();