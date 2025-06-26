const { chromium } = require('playwright');

/**
 * Test to verify SVG elements are always narrower than their container divs
 * Tests at multiple viewport widths: 800, 1100, 1400, 1700, 2000, 2300
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Test viewport widths
  const viewportWidths = [500, 800, 1100, 1400, 1700, 2000, 2300];
  const results = [];
  
  try {
    for (const viewportWidth of viewportWidths) {
      const page = await browser.newPage();
      
      // Set viewport
      await page.setViewportSize({ width: viewportWidth, height: 800 });
      
      // Navigate to SPC dashboard
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForSelector('svg', { timeout: 10000 });
      await page.waitForTimeout(2000); // Wait for layout to stabilize
      
      // Analyze SVG vs container widths
      const analysis = await page.evaluate(() => {
        const containers = document.querySelectorAll('div.bg-white.p-4.rounded-lg.shadow');
        const results = [];
        
        containers.forEach((container, index) => {
          const containerRect = container.getBoundingClientRect();
          const containerStyle = window.getComputedStyle(container);
          const containerPadding = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
          const containerContentWidth = containerRect.width - containerPadding;
          
          const svg = container.querySelector('svg');
          if (svg) {
            const svgRect = svg.getBoundingClientRect();
            const svgWidth = parseFloat(svg.getAttribute('width') || '0');
            
            // Check if SVG is wider than container content area
            const svgWiderThanContainer = svgRect.width > containerContentWidth;
            
            // Check if horizontal scroll is present
            const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
            
            results.push({
              chartIndex: index,
              containerWidth: containerRect.width,
              containerPadding: containerPadding,
              containerContentWidth: containerContentWidth,
              svgAttributeWidth: svgWidth,
              svgActualWidth: svgRect.width,
              svgWiderThanContainer: svgWiderThanContainer,
              hasHorizontalScroll: hasHorizontalScroll,
              overflow: Math.max(0, svgRect.width - containerContentWidth)
            });
          }
        });
        
        return results;
      });
      
      // Take screenshot for this viewport width
      await page.screenshot({ 
        path: `/home/dwdra/tmp/tests/playwright_png/svg-width-test-${viewportWidth}px.png`,
        fullPage: true 
      });
      
      // Store results
      results.push({
        viewportWidth: viewportWidth,
        charts: analysis
      });
      
      await page.close();
    }
    
    // Display results
    console.log('=== SVG vs Container Width Test Results ===\n');
    
    let anyIssues = false;
    
    results.forEach(result => {
      console.log(`Viewport Width: ${result.viewportWidth}px`);
      
      result.charts.forEach(chart => {
        if (chart.svgWiderThanContainer) {
          anyIssues = true;
          console.log(`  ❌ Chart ${chart.chartIndex}: SVG (${chart.svgActualWidth}px) > Container (${chart.containerContentWidth}px)`);
          console.log(`     Overflow: ${chart.overflow.toFixed(1)}px`);
          console.log(`     Has scroll: ${chart.hasHorizontalScroll}`);
        } else {
          console.log(`  ✅ Chart ${chart.chartIndex}: SVG (${chart.svgActualWidth}px) ≤ Container (${chart.containerContentWidth}px)`);
        }
      });
      
      console.log('');
    });
    
    // Summary
    console.log('=== Summary ===');
    if (anyIssues) {
      console.log('❌ Some charts have SVGs wider than their containers');
      console.log('\nRecommendation: Consider making chart width responsive or reducing fixed width values');
    } else {
      console.log('✅ All SVGs fit within their containers at all tested viewport widths');
    }
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync(
      '/home/dwdra/tmp/tests/playwright_md/svg-width-test-results.json', 
      JSON.stringify(results, null, 2)
    );
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();