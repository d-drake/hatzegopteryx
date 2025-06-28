const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();
  
  try {
    console.log('=== Comprehensive Overflow Test (1500px - 2400px) ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Test at more viewport widths, especially in the problematic range
    const testWidths = [
      1500, 1550, 1600, 1650, 1700, 1750, 1800, 1850, 1900, 
      1950, 2000, 2050, 2100, 2150, 2200, 2250, 2300, 2350, 2400
    ];
    
    const overflowResults = [];
    
    for (const width of testWidths) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(500);
      
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
          
          // Get inner content that might be overflowing
          const innerContent = chartContainer.querySelector('.relative > div');
          const innerWidth = innerContent ? innerContent.getBoundingClientRect().width : 0;
          
          results.push({
            chart: chartName,
            containerWidth: containerWidth.toFixed(1),
            svgWidth: svgWidth.toFixed(1),
            overflow: overflow,
            overflowAmount: overflowAmount.toFixed(1),
            visualOverflow: visualOverflow,
            visualOverflowAmount: visualOverflowAmount.toFixed(1),
            innerWidth: innerWidth.toFixed(1),
            styleWidth: chartContainer.style.width
          });
        }
        
        return { charts: results };
      });
      
      // Check if there's any overflow
      const hasOverflow = overflowInfo.charts.some(c => c.overflow || c.visualOverflow);
      
      // Store result
      overflowResults.push({
        width,
        hasOverflow,
        details: overflowInfo.charts
      });
      
      // Only print details if there's overflow or at key widths
      if (hasOverflow || [1600, 1700, 1800, 1900, 2000, 2400].includes(width)) {
        console.log(`\n${width}px viewport:`);
        overflowInfo.charts.forEach(chart => {
          if (chart.overflow || chart.visualOverflow) {
            console.log(`  ${chart.chart}: ⚠️  OVERFLOW`);
            console.log(`    Container: ${chart.containerWidth}px, SVG: ${chart.svgWidth}px`);
            console.log(`    Overflow amount: ${chart.overflowAmount}px`);
          } else {
            console.log(`  ${chart.chart}: ✓ OK (Container: ${chart.containerWidth}px, SVG: ${chart.svgWidth}px)`);
          }
        });
      }
      
      // Take screenshot if overflow detected
      if (hasOverflow) {
        await page.screenshot({ 
          path: `/home/dwdra/tmp/tests/playwright_png/overflow-${width}px.png`,
          fullPage: true 
        });
        console.log(`  Screenshot saved: overflow-${width}px.png`);
      }
    }
    
    // Summary
    console.log('\n=== Summary ===');
    const overflowWidths = overflowResults.filter(r => r.hasOverflow).map(r => r.width);
    if (overflowWidths.length > 0) {
      console.log(`\n⚠️  Overflow detected at these widths: ${overflowWidths.join(', ')}px`);
      
      // Find the first width where overflow occurs
      const firstOverflow = overflowWidths[0];
      console.log(`\nFirst overflow occurs at: ${firstOverflow}px`);
      
      // Show details for first overflow
      const firstOverflowDetails = overflowResults.find(r => r.width === firstOverflow);
      console.log('\nDetails at first overflow:');
      firstOverflowDetails.details.forEach(chart => {
        console.log(`  ${chart.chart}: Container ${chart.containerWidth}px, SVG ${chart.svgWidth}px (${chart.overflowAmount}px overflow)`);
      });
    } else {
      console.log('\n✓ No overflow detected at any tested width!');
    }
    
    console.log('\n=== Test Complete ===');
    console.log('Browser will remain open for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/comprehensive-overflow-error.png' 
    });
  } finally {
    await browser.close();
  }
})();