const { chromium } = require('playwright');

/**
 * Specific verification test for 500px viewport
 * Ensures the responsive solution works correctly at this critical size
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== 500px Viewport Verification ===\n');
    
    // Set viewport to exactly 500px
    await page.setViewportSize({ width: 500, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow responsive calculation
    
    // Detailed analysis
    const analysis = await page.evaluate(() => {
      const results = {
        viewport: window.innerWidth,
        body: document.body.clientWidth,
        charts: []
      };
      
      // Check each chart
      const containers = document.querySelectorAll('div.bg-white.p-4.rounded-lg.shadow');
      containers.forEach((container, index) => {
        const rect = container.getBoundingClientRect();
        const style = window.getComputedStyle(container);
        const svg = container.querySelector('svg');
        
        if (svg) {
          const svgRect = svg.getBoundingClientRect();
          const svgWidth = parseFloat(svg.getAttribute('width') || '0');
          const svgHeight = parseFloat(svg.getAttribute('height') || '0');
          
          // Calculate exact measurements
          const containerPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
          const availableWidth = rect.width - containerPadding;
          const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
          const hasVerticalScroll = container.scrollHeight > container.clientHeight;
          
          // Check if responsive width was applied correctly
          const expectedWidth = Math.min(800, availableWidth);
          const isCorrectWidth = Math.abs(svgWidth - expectedWidth) < 1; // Allow 1px tolerance
          
          results.charts.push({
            index,
            title: container.querySelector('h4')?.textContent || `Chart ${index}`,
            container: {
              width: rect.width,
              padding: containerPadding,
              availableWidth: availableWidth
            },
            svg: {
              width: svgWidth,
              height: svgHeight,
              actualWidth: svgRect.width,
              actualHeight: svgRect.height
            },
            expectedWidth: expectedWidth,
            isCorrectWidth: isCorrectWidth,
            hasHorizontalScroll: hasHorizontalScroll,
            hasVerticalScroll: hasVerticalScroll,
            overflow: svgWidth - availableWidth
          });
        }
      });
      
      return results;
    });
    
    // Display results
    console.log(`Viewport: ${analysis.viewport}px`);
    console.log(`Body width: ${analysis.body}px\n`);
    
    console.log('Chart Analysis:');
    analysis.charts.forEach(chart => {
      console.log(`\n${chart.title}:`);
      console.log(`  Container: ${chart.container.width}px (available: ${chart.container.availableWidth}px)`);
      console.log(`  SVG dimensions: ${chart.svg.width}px × ${chart.svg.height}px`);
      console.log(`  Expected width: ${chart.expectedWidth}px`);
      console.log(`  Width calculation correct: ${chart.isCorrectWidth ? '✅ Yes' : '❌ No'}`);
      console.log(`  Horizontal scroll: ${chart.hasHorizontalScroll ? '❌ Yes' : '✅ No'}`);
      console.log(`  Overflow: ${chart.overflow > 0 ? `❌ ${chart.overflow}px` : '✅ None'}`);
    });
    
    // Overall verdict
    const allChartsResponsive = analysis.charts.every(c => 
      c.isCorrectWidth && !c.hasHorizontalScroll && c.overflow <= 0
    );
    
    console.log('\n=== Verdict ===');
    if (allChartsResponsive) {
      console.log('✅ SUCCESS: All charts are properly responsive at 500px viewport!');
      console.log('   - No horizontal scrolling');
      console.log('   - SVGs fit within containers');
      console.log('   - Responsive width calculation is correct');
    } else {
      console.log('❌ FAILURE: Some charts have issues at 500px viewport');
      const issues = analysis.charts.filter(c => 
        !c.isCorrectWidth || c.hasHorizontalScroll || c.overflow > 0
      );
      issues.forEach(issue => {
        console.log(`   - ${issue.title}: ${issue.overflow > 0 ? 'Overflow detected' : 'Width calculation incorrect'}`);
      });
    }
    
    // Take detailed screenshots
    await page.screenshot({
      path: '/home/dwdra/tmp/tests/playwright_png/500px-verification-full.png',
      fullPage: true
    });
    
    // Take close-up of first chart
    const firstChart = await page.$('div.bg-white.p-4.rounded-lg.shadow');
    if (firstChart) {
      await firstChart.screenshot({
        path: '/home/dwdra/tmp/tests/playwright_png/500px-verification-chart.png'
      });
    }
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync(
      '/home/dwdra/tmp/tests/playwright_md/500px-verification-results.json',
      JSON.stringify(analysis, null, 2)
    );
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();