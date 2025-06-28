const { chromium } = require('playwright');

/**
 * Comprehensive analysis test for SVG responsive sizing
 * Analyzes container constraints, breakpoints, and optimal sizing strategies
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Extended viewport widths for analysis
  const viewportWidths = [320, 375, 414, 500, 600, 768, 800, 1024, 1100, 1280, 1400, 1600, 1920];
  const analysisResults = [];
  
  try {
    for (const viewportWidth of viewportWidths) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: viewportWidth, height: 800 });
      
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForSelector('svg', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Comprehensive analysis
      const analysis = await page.evaluate(() => {
        const results = {
          viewport: window.innerWidth,
          body: document.body.clientWidth,
          mainContainer: null,
          chartContainers: []
        };
        
        // Analyze main container
        const main = document.querySelector('main');
        if (main) {
          const mainRect = main.getBoundingClientRect();
          const mainStyle = window.getComputedStyle(main);
          results.mainContainer = {
            width: mainRect.width,
            padding: mainStyle.padding,
            margin: mainStyle.margin,
            maxWidth: mainStyle.maxWidth
          };
        }
        
        // Analyze each chart container
        const containers = document.querySelectorAll('div.bg-white.p-4.rounded-lg.shadow');
        containers.forEach((container, index) => {
          const rect = container.getBoundingClientRect();
          const style = window.getComputedStyle(container);
          const svg = container.querySelector('svg');
          
          // Calculate available space
          const paddingH = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
          const borderH = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
          const availableWidth = rect.width - paddingH - borderH;
          
          let svgData = null;
          if (svg) {
            const svgRect = svg.getBoundingClientRect();
            svgData = {
              width: parseFloat(svg.getAttribute('width') || '0'),
              height: parseFloat(svg.getAttribute('height') || '0'),
              actualWidth: svgRect.width,
              viewBox: svg.getAttribute('viewBox'),
              preserveAspectRatio: svg.getAttribute('preserveAspectRatio'),
              style: {
                width: svg.style.width,
                maxWidth: svg.style.maxWidth,
                minWidth: svg.style.minWidth
              }
            };
          }
          
          // Calculate optimal width
          const optimalWidth = Math.min(800, availableWidth);
          const currentOverflow = svgData ? Math.max(0, svgData.width - availableWidth) : 0;
          
          results.chartContainers.push({
            index,
            containerWidth: rect.width,
            padding: paddingH,
            border: borderH,
            availableWidth: availableWidth,
            svg: svgData,
            optimalWidth: optimalWidth,
            overflow: currentOverflow,
            needsAdjustment: currentOverflow > 0
          });
        });
        
        return results;
      });
      
      analysisResults.push({
        viewportWidth,
        ...analysis
      });
      
      await page.close();
    }
    
    // Display analysis
    console.log('=== SVG Responsive Sizing Analysis ===\n');
    
    // Group by adjustment needs
    const needsAdjustment = analysisResults.filter(r => 
      r.chartContainers.some(c => c.needsAdjustment)
    );
    const fitsWell = analysisResults.filter(r => 
      r.chartContainers.every(c => !c.needsAdjustment)
    );
    
    console.log('Viewports requiring adjustment:');
    needsAdjustment.forEach(result => {
      const chart = result.chartContainers[0]; // All charts have same dimensions
      console.log(`  ${result.viewportWidth}px: Available ${chart.availableWidth}px < SVG ${chart.svg.width}px (overflow: ${chart.overflow}px)`);
    });
    
    console.log('\nViewports that fit well:');
    fitsWell.forEach(result => {
      const chart = result.chartContainers[0];
      console.log(`  ${result.viewportWidth}px: Available ${chart.availableWidth}px ≥ SVG ${chart.svg.width}px`);
    });
    
    // Calculate breakpoint
    const breakpoint = fitsWell.length > 0 ? fitsWell[0].viewportWidth : null;
    console.log(`\nSuggested breakpoint: ${breakpoint}px`);
    
    // Calculate responsive formula
    console.log('\n=== Responsive Width Calculation ===');
    console.log('Current: width = 800px (fixed)');
    console.log('Suggested: width = min(800px, containerWidth - 32px)');
    console.log('  where containerWidth = viewport - margins - padding');
    
    // Save detailed analysis
    const fs = require('fs');
    fs.writeFileSync(
      '/home/dwdra/tmp/tests/playwright_md/svg-responsive-analysis.json',
      JSON.stringify(analysisResults, null, 2)
    );
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();