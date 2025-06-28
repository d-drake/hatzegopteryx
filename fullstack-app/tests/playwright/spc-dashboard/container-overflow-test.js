const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();
  
  try {
    console.log('=== Container Overflow Test ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Test at different viewport widths
    const testWidths = [1500, 1600, 1920, 2560];
    
    for (const width of testWidths) {
      console.log(`\nTesting at ${width}px viewport width:`);
      
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(1000);
      
      // Check for overflow
      const overflowInfo = await page.evaluate(() => {
        const container = document.querySelector('.bg-white.rounded-lg.shadow');
        if (!container) return { error: 'Container not found' };
        
        // Find the side-by-side container
        const flexContainer = container.querySelector('.flex.gap-\\[5px\\]');
        if (!flexContainer) return { error: 'Not in side-by-side mode' };
        
        const charts = flexContainer.children;
        if (charts.length !== 2) return { error: 'Expected 2 charts' };
        
        const results = [];
        
        for (let i = 0; i < 2; i++) {
          const chartContainer = charts[i];
          const chartName = i === 0 ? 'Timeline' : 'Variability';
          
          // Get container dimensions
          const containerRect = chartContainer.getBoundingClientRect();
          const containerStyle = window.getComputedStyle(chartContainer);
          const containerWidth = parseFloat(containerStyle.width);
          
          // Find the SVG inside
          const svg = chartContainer.querySelector('svg');
          if (!svg) {
            results.push({ chart: chartName, error: 'No SVG found' });
            continue;
          }
          
          const svgRect = svg.getBoundingClientRect();
          const svgWidth = parseFloat(svg.getAttribute('width') || '0');
          
          // Check for overflow
          const overflow = svgWidth > containerWidth;
          const overflowAmount = svgWidth - containerWidth;
          
          // Also check visual overflow
          const visualOverflow = svgRect.width > containerRect.width;
          const visualOverflowAmount = svgRect.width - containerRect.width;
          
          results.push({
            chart: chartName,
            containerWidth: containerWidth.toFixed(1),
            svgWidth: svgWidth.toFixed(1),
            overflow: overflow,
            overflowAmount: overflowAmount.toFixed(1),
            visualOverflow: visualOverflow,
            visualOverflowAmount: visualOverflowAmount.toFixed(1),
            // Get the actual style width set on container
            styleWidth: chartContainer.style.width
          });
        }
        
        // Also check the flex container itself
        const flexRect = flexContainer.getBoundingClientRect();
        const parentRect = flexContainer.parentElement.getBoundingClientRect();
        const flexOverflow = flexRect.width > parentRect.width;
        
        return {
          charts: results,
          flexContainerOverflow: flexOverflow,
          flexWidth: flexRect.width.toFixed(1),
          parentWidth: parentRect.width.toFixed(1)
        };
      });
      
      console.log('\nChart Analysis:');
      overflowInfo.charts.forEach(chart => {
        console.log(`\n  ${chart.chart}:`);
        console.log(`    Container width: ${chart.containerWidth}px (style: ${chart.styleWidth})`);
        console.log(`    SVG width: ${chart.svgWidth}px`);
        console.log(`    Overflow: ${chart.overflow ? `YES (${chart.overflowAmount}px)` : 'NO'}`);
        console.log(`    Visual overflow: ${chart.visualOverflow ? `YES (${chart.visualOverflowAmount}px)` : 'NO'}`);
      });
      
      console.log(`\n  Flex container overflow: ${overflowInfo.flexContainerOverflow ? 'YES' : 'NO'}`);
      console.log(`  Flex width: ${overflowInfo.flexWidth}px, Parent width: ${overflowInfo.parentWidth}px`);
      
      // Take screenshot if there's overflow
      const hasOverflow = overflowInfo.charts.some(c => c.overflow || c.visualOverflow) || overflowInfo.flexContainerOverflow;
      if (hasOverflow) {
        await page.screenshot({ 
          path: `/home/dwdra/tmp/tests/playwright_png/overflow-${width}px.png`,
          fullPage: true 
        });
        console.log(`  ⚠️  OVERFLOW DETECTED - Screenshot saved: overflow-${width}px.png`);
      } else {
        console.log(`  ✓ No overflow detected`);
      }
    }
    
    console.log('\n=== Test Complete ===');
    console.log('Browser will remain open for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/overflow-error.png' 
    });
  } finally {
    await browser.close();
  }
})();