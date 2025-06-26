const { chromium } = require('playwright');

/**
 * Comprehensive test for responsive SVG implementation
 * Verifies that SVGs are always smaller than their containers
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Test all critical viewport widths
  const viewportWidths = [320, 375, 414, 500, 600, 768, 800, 1024, 1100, 1280, 1400, 1920];
  const testResults = [];
  let allTestsPassed = true;
  
  try {
    console.log('=== Responsive SVG Implementation Test ===\n');
    console.log('Testing that SVGs are always smaller than their containers...\n');
    
    for (const viewportWidth of viewportWidths) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: viewportWidth, height: 800 });
      
      // Navigate to the dashboard
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
      
      // Wait for charts to load and responsive width to calculate
      await page.waitForSelector('svg', { timeout: 10000 });
      await page.waitForTimeout(3000); // Extra time for responsive calculation
      
      // Analyze the implementation
      const analysis = await page.evaluate(() => {
        const results = {
          viewport: window.innerWidth,
          charts: []
        };
        
        // Find all chart containers
        const containers = document.querySelectorAll('div.bg-white.p-4.rounded-lg.shadow');
        
        containers.forEach((container, index) => {
          const containerRect = container.getBoundingClientRect();
          const containerStyle = window.getComputedStyle(container);
          const paddingH = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
          const availableWidth = containerRect.width - paddingH;
          
          const svg = container.querySelector('svg');
          let svgAnalysis = null;
          
          if (svg) {
            const svgRect = svg.getBoundingClientRect();
            const svgWidth = parseFloat(svg.getAttribute('width') || '0');
            
            // Check if SVG fits within container
            const fitsInContainer = svgWidth <= availableWidth;
            const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
            
            svgAnalysis = {
              svgWidth: svgWidth,
              svgActualWidth: svgRect.width,
              containerWidth: containerRect.width,
              availableWidth: availableWidth,
              fitsInContainer: fitsInContainer,
              hasHorizontalScroll: hasHorizontalScroll,
              margin: availableWidth - svgWidth,
              status: fitsInContainer && !hasHorizontalScroll ? 'PASS' : 'FAIL'
            };
          }
          
          results.charts.push({
            index,
            title: container.querySelector('h4')?.textContent || 'Unknown',
            analysis: svgAnalysis
          });
        });
        
        return results;
      });
      
      // Store results
      const viewportResult = {
        viewport: viewportWidth,
        passed: analysis.charts.every(c => c.analysis?.status === 'PASS'),
        details: analysis
      };
      
      testResults.push(viewportResult);
      
      // Display results for this viewport
      const status = viewportResult.passed ? '✅' : '❌';
      console.log(`${status} ${viewportWidth}px viewport:`);
      
      analysis.charts.forEach(chart => {
        if (chart.analysis) {
          const chartStatus = chart.analysis.status === 'PASS' ? '✓' : '✗';
          console.log(`   ${chartStatus} ${chart.title}: SVG ${chart.analysis.svgWidth}px in ${chart.analysis.availableWidth}px container`);
          
          if (chart.analysis.status === 'FAIL') {
            console.log(`      Problem: SVG exceeds container by ${chart.analysis.svgWidth - chart.analysis.availableWidth}px`);
            allTestsPassed = false;
          }
        }
      });
      
      // Take screenshot
      await page.screenshot({
        path: `/home/dwdra/tmp/tests/playwright_png/responsive-impl-${viewportWidth}px.png`,
        fullPage: true
      });
      
      await page.close();
    }
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`Total viewports tested: ${viewportWidths.length}`);
    console.log(`Passed: ${testResults.filter(r => r.passed).length}`);
    console.log(`Failed: ${testResults.filter(r => !r.passed).length}`);
    
    if (allTestsPassed) {
      console.log('\n✅ SUCCESS: All SVGs fit within their containers at all viewport sizes!');
    } else {
      console.log('\n❌ FAILURE: Some SVGs exceed their containers. See details above.');
      
      // List failing viewports
      const failingViewports = testResults.filter(r => !r.passed).map(r => r.viewport);
      console.log(`\nFailing viewports: ${failingViewports.join(', ')}px`);
    }
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync(
      '/home/dwdra/tmp/tests/playwright_md/responsive-implementation-results.json',
      JSON.stringify(testResults, null, 2)
    );
    
  } catch (error) {
    console.error('Test error:', error);
    allTestsPassed = false;
  } finally {
    await browser.close();
    
    // Exit with appropriate code
    process.exit(allTestsPassed ? 0 : 1);
  }
})();