const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== Debugging Page Structure ===\n');
    
    // Set viewport and navigate
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('Waiting for initial load...');
    await page.waitForTimeout(5000);
    
    // Get basic page info
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyClasses: document.body.className,
        hasMainContent: !!document.querySelector('main'),
        allDivCount: document.querySelectorAll('div').length,
        chartContainerCount: document.querySelectorAll('.bg-white.rounded-lg.shadow').length,
        svgCount: document.querySelectorAll('svg').length,
        buttonCount: document.querySelectorAll('button').length,
        // Get all button texts
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean),
      };
    });
    
    console.log('Page info:', JSON.stringify(pageInfo, null, 2));
    
    // Look for chart containers with different selectors
    console.log('\nLooking for chart containers...');
    const containerSelectors = [
      '.bg-white.rounded-lg.shadow',
      '[class*="rounded"]',
      '[class*="shadow"]',
      'div[class*="chart"]',
      'main div div',
    ];
    
    for (const selector of containerSelectors) {
      const count = await page.$$eval(selector, elements => elements.length);
      console.log(`${selector}: ${count} elements`);
    }
    
    // Wait a bit more and check if SVGs appear
    console.log('\nWaiting for SVGs to render...');
    await page.waitForTimeout(3000);
    
    const svgInfo = await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      return Array.from(svgs).map((svg, i) => ({
        index: i,
        className: svg.className.baseVal || svg.className || 'none',
        id: svg.id || 'none',
        width: svg.getAttribute('width'),
        height: svg.getAttribute('height'),
        parentTag: svg.parentElement?.tagName,
        parentClasses: svg.parentElement?.className || 'none',
      }));
    });
    
    console.log('\nSVG elements found:', JSON.stringify(svgInfo, null, 2));
    
    // Try to find and click a Variability button
    console.log('\nLooking for Variability buttons...');
    const variabilityButtons = await page.$$('button:has-text("Variability")');
    console.log(`Found ${variabilityButtons.length} Variability buttons`);
    
    if (variabilityButtons.length > 0) {
      console.log('Clicking first Variability button...');
      await variabilityButtons[0].click();
      await page.waitForTimeout(3000);
      
      // Check what changed
      const afterClick = await page.evaluate(() => {
        return {
          svgCount: document.querySelectorAll('svg').length,
          chartContainerCount: document.querySelectorAll('.bg-white.rounded-lg.shadow').length,
          variabilityChartExists: !!document.querySelector('.variability-chart'),
          variabilityContainerExists: !!document.querySelector('.variability-chart-container'),
          boxPlotExists: !!document.querySelector('.box-plot'),
        };
      });
      
      console.log('\nAfter clicking Variability:', JSON.stringify(afterClick, null, 2));
    }
    
    // Take a screenshot for visual inspection
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/debug-page-structure.png',
      fullPage: true 
    });
    console.log('\nScreenshot saved to: ~/tmp/tests/playwright_png/debug-page-structure.png');
    
    console.log('\nKeeping browser open for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/debug-error.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
})();