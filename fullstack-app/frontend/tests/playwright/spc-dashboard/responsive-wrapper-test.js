const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();
  
  try {
    console.log('=== ResponsiveChartWrapper Overflow Test ===\n');
    
    // Add console logging to catch any client-side errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Focus on the problematic range
    const testWidths = [1700, 1750, 1800, 1850, 1900];
    
    for (const width of testWidths) {
      console.log(`\nTesting at ${width}px viewport width:`);
      
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(1000);
      
      // More detailed analysis
      const analysis = await page.evaluate(() => {
        const results = {
          timeline: {},
          variability: {}
        };
        
        // Find containers
        const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
        if (!flexContainer) return { error: 'Not in side-by-side mode' };
        
        const charts = Array.from(flexContainer.children);
        
        charts.forEach((chart, index) => {
          const chartName = index === 0 ? 'timeline' : 'variability';
          const result = results[chartName];
          
          // Container info
          result.containerWidth = chart.getBoundingClientRect().width;
          result.containerStyle = chart.style.width;
          
          // Find ResponsiveChartWrapper div (should be direct child)
          const responsiveWrapper = chart.querySelector(':scope > div');
          if (responsiveWrapper) {
            result.wrapperWidth = responsiveWrapper.getBoundingClientRect().width;
            result.wrapperStyle = window.getComputedStyle(responsiveWrapper).width;
          }
          
          // Find SVG
          const svg = chart.querySelector('svg');
          if (svg) {
            result.svgWidth = parseFloat(svg.getAttribute('width') || '0');
            result.svgActualWidth = svg.getBoundingClientRect().width;
            
            // Check parent of SVG
            const svgParent = svg.parentElement;
            result.svgParentWidth = svgParent.getBoundingClientRect().width;
          }
          
          // Calculate overflows
          if (result.svgWidth && result.containerWidth) {
            result.overflow = result.svgWidth > result.containerWidth;
            result.overflowAmount = result.svgWidth - result.containerWidth;
          }
          
          // Check if ResponsiveWrapper is limiting
          if (result.wrapperWidth && result.containerWidth) {
            result.wrapperLimited = result.wrapperWidth < result.containerWidth;
            result.wrapperGap = result.containerWidth - result.wrapperWidth;
          }
        });
        
        return results;
      });
      
      // Display results
      ['timeline', 'variability'].forEach(chartName => {
        const data = analysis[chartName];
        console.log(`\n  ${chartName.charAt(0).toUpperCase() + chartName.slice(1)}:`);
        console.log(`    Container: ${data.containerWidth?.toFixed(1)}px (style: ${data.containerStyle})`);
        console.log(`    Wrapper: ${data.wrapperWidth?.toFixed(1)}px`);
        console.log(`    SVG: ${data.svgWidth?.toFixed(1)}px (actual: ${data.svgActualWidth?.toFixed(1)}px)`);
        
        if (data.overflow) {
          console.log(`    ⚠️  OVERFLOW: ${data.overflowAmount.toFixed(1)}px`);
        }
        
        if (data.wrapperLimited) {
          console.log(`    ⚠️  Wrapper is ${data.wrapperGap.toFixed(1)}px smaller than container!`);
        }
      });
      
      // Check for any limiting
      const hasIssue = analysis.timeline.overflow || analysis.variability.overflow || 
                      analysis.timeline.wrapperLimited || analysis.variability.wrapperLimited;
      
      if (hasIssue) {
        await page.screenshot({ 
          path: `/home/dwdra/tmp/tests/playwright_png/wrapper-issue-${width}px.png`,
          fullPage: true 
        });
        console.log(`\n  Screenshot saved: wrapper-issue-${width}px.png`);
      }
    }
    
    // Also test the visual test page if it exists
    console.log('\n\nChecking visual test page...');
    await page.goto('http://localhost:3000/test-side-by-side');
    await page.waitForTimeout(2000);
    
    // Select 1800px from dropdown
    const selectExists = await page.$('select');
    if (selectExists) {
      await page.selectOption('select', '1800');
      await page.waitForTimeout(2000);
      
      console.log('Visual test page at 1800px - check manually');
      await page.screenshot({ 
        path: `/home/dwdra/tmp/tests/playwright_png/visual-test-1800px.png`,
        fullPage: true 
      });
    }
    
    console.log('\n=== Test Complete ===');
    console.log('Browser will remain open for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/responsive-wrapper-error.png' 
    });
  } finally {
    await browser.close();
  }
})();