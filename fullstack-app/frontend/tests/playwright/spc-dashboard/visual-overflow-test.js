const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Visual Overflow Test ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for charts to fully render
    
    // Test key viewport widths
    const testCases = [
      { width: 1400, name: 'tabbed-mode' },
      { width: 1500, name: 'breakpoint' },
      { width: 1800, name: 'reported-issue' },
      { width: 2400, name: 'max-width' }
    ];
    
    for (const testCase of testCases) {
      await page.setViewportSize({ width: testCase.width, height: 900 });
      await page.waitForTimeout(2000); // Wait for layout adjustment
      
      // Add visual indicators for overflow
      await page.evaluate(() => {
        // Remove previous indicators
        document.querySelectorAll('.overflow-indicator').forEach(el => el.remove());
        
        // Check for overflow and add indicators
        const checkOverflow = (element, name) => {
          if (element && element.scrollWidth > element.clientWidth) {
            const indicator = document.createElement('div');
            indicator.className = 'overflow-indicator';
            indicator.style.cssText = `
              position: absolute;
              top: 0;
              right: 0;
              background: red;
              color: white;
              padding: 4px 8px;
              font-size: 12px;
              z-index: 9999;
            `;
            indicator.textContent = `OVERFLOW: ${name}`;
            element.style.position = 'relative';
            element.appendChild(indicator);
          }
        };
        
        // Check all potential overflow containers
        const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
        if (flexContainer) {
          flexContainer.querySelectorAll(':scope > div').forEach((div, i) => {
            checkOverflow(div, i === 0 ? 'Timeline' : 'Variability');
          });
        }
      });
      
      // Take screenshot
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `~/tmp/tests/playwright_png/overflow-test-${testCase.name}-${testCase.width}px-${timestamp}.png`;
      
      await page.screenshot({ 
        path: filename,
        fullPage: false,
        clip: {
          x: 0,
          y: 100,
          width: testCase.width,
          height: 600
        }
      });
      
      console.log(`✓ Screenshot saved: ${testCase.name} at ${testCase.width}px`);
      console.log(`  File: ${filename}`);
    }
    
    console.log('\n✅ Visual test completed. Check screenshots for any overflow indicators.');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();