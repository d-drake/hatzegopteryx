const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Side-by-Side Layout Test ===\n');
    
    // Test viewport widths
    const testWidths = [
      { width: 500, expected: 'tabbed', name: 'Mobile' },
      { width: 800, expected: 'tabbed', name: 'Tablet' },
      { width: 1024, expected: 'tabbed', name: 'Small Desktop' },
      { width: 1200, expected: 'tabbed', name: 'Medium Desktop' },
      { width: 1499, expected: 'tabbed', name: 'Just Below Breakpoint' },
      { width: 1500, expected: 'side-by-side', name: 'At Breakpoint' },
      { width: 1600, expected: 'side-by-side', name: 'Above Breakpoint' },
      { width: 1920, expected: 'side-by-side', name: 'Full HD' },
      { width: 2560, expected: 'side-by-side', name: '2K' },
      { width: 3840, expected: 'side-by-side', name: '4K' }
    ];
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    for (const test of testWidths) {
      console.log(`\nTesting ${test.name} (${test.width}px):`);
      
      // Set viewport
      await page.setViewportSize({ width: test.width, height: 900 });
      await page.waitForTimeout(500); // Wait for resize to settle
      
      // Check layout
      const layoutInfo = await page.evaluate(() => {
        const container = document.querySelector('.bg-white.rounded-lg.shadow');
        if (!container) return { error: 'No container found' };
        
        // Check for tabs
        const tabButtons = container.querySelectorAll('button');
        const tabs = Array.from(tabButtons).filter(btn => 
          btn.textContent?.includes('Timeline') || btn.textContent?.includes('Variability')
        );
        const hasTabs = tabs.length > 0;
        
        // Check for side-by-side flex container
        const flexContainer = container.querySelector('.flex.gap-\\[5px\\]');
        const hasSideBySide = !!flexContainer && flexContainer.children.length === 2;
        
        // Count visible charts
        const svgs = container.querySelectorAll('svg');
        const visibleSvgs = Array.from(svgs).filter(svg => {
          const rect = svg.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        
        // Get chart dimensions if side-by-side
        let chartDimensions = null;
        if (hasSideBySide && flexContainer) {
          const charts = flexContainer.children;
          chartDimensions = {
            timeline: {
              width: charts[0]?.getBoundingClientRect().width,
              svg: charts[0]?.querySelector('svg')?.getBoundingClientRect()
            },
            variability: {
              width: charts[1]?.getBoundingClientRect().width,
              svg: charts[1]?.querySelector('svg')?.getBoundingClientRect()
            }
          };
        }
        
        return {
          hasTabs,
          hasSideBySide,
          visibleChartCount: visibleSvgs.length,
          layout: hasSideBySide ? 'side-by-side' : (hasTabs ? 'tabbed' : 'unknown'),
          chartDimensions
        };
      });
      
      console.log(`  Layout: ${layoutInfo.layout}`);
      console.log(`  Expected: ${test.expected}`);
      console.log(`  Status: ${layoutInfo.layout === test.expected ? '✓ PASS' : '✗ FAIL'}`);
      
      if (layoutInfo.layout === 'side-by-side' && layoutInfo.chartDimensions) {
        const dims = layoutInfo.chartDimensions;
        console.log(`  Timeline width: ${dims.timeline.width?.toFixed(0)}px`);
        console.log(`  Variability width: ${dims.variability.width?.toFixed(0)}px`);
        
        // Check if x-axis widths are equal
        if (dims.timeline.svg && dims.variability.svg) {
          const timelineChartArea = dims.timeline.svg.width - 70 - 240; // left - right margins
          const variabilityChartArea = dims.variability.svg.width - 70 - 50; // left - right margins
          const difference = Math.abs(timelineChartArea - variabilityChartArea);
          console.log(`  X-axis width difference: ${difference.toFixed(1)}px ${difference < 2 ? '✓' : '✗'}`);
        }
      }
      
      // Take screenshot at key breakpoints
      if ([1499, 1500, 1920].includes(test.width)) {
        await page.screenshot({ 
          path: `/home/dwdra/tmp/tests/playwright_png/side-by-side-${test.width}px.png`,
          fullPage: true 
        });
        console.log(`  Screenshot saved: side-by-side-${test.width}px.png`);
      }
    }
    
    // Test zoom sync in side-by-side mode
    console.log('\n=== Testing Zoom Sync in Side-by-Side Mode ===');
    
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.waitForTimeout(500);
    
    // Get initial Y-axis values
    const getYAxisRange = async () => {
      return await page.evaluate(() => {
        const charts = document.querySelectorAll('.flex.gap-\\[5px\\] > div svg');
        if (charts.length !== 2) return null;
        
        const getRange = (svg) => {
          const ticks = svg.querySelectorAll('.tick text');
          const values = Array.from(ticks)
            .map(tick => parseFloat(tick.textContent))
            .filter(v => !isNaN(v));
          
          return values.length > 0 ? {
            min: Math.min(...values),
            max: Math.max(...values)
          } : null;
        };
        
        return {
          timeline: getRange(charts[0]),
          variability: getRange(charts[1])
        };
      });
    };
    
    const initialRanges = await getYAxisRange();
    console.log('\nInitial Y-axis ranges:');
    console.log(`  Timeline: ${initialRanges?.timeline?.min} to ${initialRanges?.timeline?.max}`);
    console.log(`  Variability: ${initialRanges?.variability?.min} to ${initialRanges?.variability?.max}`);
    
    // Zoom on Timeline
    console.log('\nZooming on Timeline chart...');
    const timelineSvg = await page.$('.flex.gap-\\[5px\\] > div:first-child svg');
    if (timelineSvg) {
      const bounds = await timelineSvg.boundingBox();
      await page.mouse.move(bounds.x + 70, bounds.y + bounds.height / 2);
      await page.mouse.wheel(0, -240);
      await page.waitForTimeout(1000);
    }
    
    const zoomedRanges = await getYAxisRange();
    console.log('\nAfter zoom Y-axis ranges:');
    console.log(`  Timeline: ${zoomedRanges?.timeline?.min} to ${zoomedRanges?.timeline?.max}`);
    console.log(`  Variability: ${zoomedRanges?.variability?.min} to ${zoomedRanges?.variability?.max}`);
    
    // Check if both charts zoomed together
    if (zoomedRanges?.timeline && zoomedRanges?.variability) {
      const synced = Math.abs(zoomedRanges.timeline.min - zoomedRanges.variability.min) < 1 &&
                     Math.abs(zoomedRanges.timeline.max - zoomedRanges.variability.max) < 1;
      console.log(`\nZoom sync: ${synced ? '✓ PASS' : '✗ FAIL'}`);
    }
    
    // Summary
    console.log('\n=== Test Summary ===');
    const passedTests = testWidths.filter(t => {
      // This is a simple check - in real test we'd store results
      return true; // Placeholder
    });
    console.log(`Layout tests: ${testWidths.length} total`);
    console.log('Zoom sync in side-by-side: TESTED');
    console.log('Equal x-axis widths: TESTED');
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/side-by-side-error.png' 
    });
  } finally {
    await browser.close();
  }
})();