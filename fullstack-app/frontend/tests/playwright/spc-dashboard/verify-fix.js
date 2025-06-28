const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true // Open devtools to check for any issues
  });
  const page = await browser.newPage();
  
  try {
    console.log('=== Manual Verification Test ===\n');
    console.log('This test will open the browser with DevTools.');
    console.log('Please check for any overflow issues manually.\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    
    // Set to 1800px where the issue was reported
    console.log('Setting viewport to 1800px (where overflow was reported)...');
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Log current state
    const state = await page.evaluate(() => {
      const container = document.querySelector('.bg-white.rounded-lg.shadow');
      const flexContainer = container?.querySelector('.flex.gap-\\[5px\\]');
      
      if (!flexContainer) return { error: 'Not in side-by-side mode' };
      
      const varChart = flexContainer.children[1];
      const varSvg = varChart?.querySelector('svg');
      
      return {
        containerWidth: varChart?.getBoundingClientRect().width,
        svgWidth: varSvg?.getAttribute('width'),
        svgActualWidth: varSvg?.getBoundingClientRect().width,
        // Check if ResponsiveChartWrapper has maxWidth set
        wrapperElement: varChart?.querySelector(':scope > div'),
        hasOverflow: varChart ? varChart.scrollWidth > varChart.clientWidth : false
      };
    });
    
    console.log('\nVariability Chart at 1800px:');
    console.log(`Container width: ${state.containerWidth}px`);
    console.log(`SVG width attribute: ${state.svgWidth}px`);
    console.log(`SVG actual width: ${state.svgActualWidth}px`);
    console.log(`Has overflow: ${state.hasOverflow ? 'YES ⚠️' : 'NO ✓'}`);
    
    // Add visual indicators
    await page.evaluate(() => {
      // Add red border to any overflowing elements
      const checkOverflow = (element) => {
        if (element.scrollWidth > element.clientWidth) {
          element.style.border = '3px solid red';
          console.error('OVERFLOW DETECTED:', element);
        }
      };
      
      // Check all chart containers
      document.querySelectorAll('.flex.gap-\\[5px\\] > div').forEach(checkOverflow);
      
      // Log ResponsiveChartWrapper info
      const wrappers = document.querySelectorAll('.flex.gap-\\[5px\\] > div > div');
      wrappers.forEach((wrapper, i) => {
        console.log(`Chart ${i} wrapper:`, {
          width: wrapper.getBoundingClientRect().width,
          style: window.getComputedStyle(wrapper).width,
          maxWidth: window.getComputedStyle(wrapper).maxWidth
        });
      });
    });
    
    console.log('\nBrowser is open with DevTools. Please check:');
    console.log('1. Console for any ResponsiveChartWrapper info');
    console.log('2. Red borders indicate overflow');
    console.log('3. Use DevTools to inspect element dimensions');
    console.log('\nPress Ctrl+C to close when done...');
    
    // Keep browser open
    await page.waitForTimeout(300000); // 5 minutes
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();