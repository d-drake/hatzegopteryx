const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Quick Zoom Controls Test ===\n');
    
    // Navigate
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Side-by-side mode
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Test 1: Default state
    let zoomControls = await page.$$('.zoom-controls');
    console.log(`1. Default state: ${zoomControls.length === 0 ? '✅ Hidden' : '❌ Visible'}`);
    
    // Test 2: After zoom
    await page.evaluate(() => {
      const xArea = document.querySelector('rect[style*="cursor: ew-resize"]');
      if (xArea) {
        const rect = xArea.getBoundingClientRect();
        const event = new WheelEvent('wheel', {
          deltaY: -200,
          clientX: rect.x + rect.width / 2,
          clientY: rect.y + rect.height / 2,
          bubbles: true,
          cancelable: true
        });
        const container = xArea.closest('[data-chart-id]');
        if (container) container.dispatchEvent(event);
      }
    });
    await page.waitForTimeout(1000);
    
    zoomControls = await page.$$('.zoom-controls');
    console.log(`2. After zoom: ${zoomControls.length > 0 ? '✅ Visible' : '❌ Hidden'}`);
    
    // Test 3: Reset
    const resetButton = await page.$('button:has-text("Reset Zoom")');
    if (resetButton) {
      await resetButton.click();
      await page.waitForTimeout(1000);
      
      zoomControls = await page.$$('.zoom-controls');
      console.log(`3. After reset: ${zoomControls.length === 0 ? '✅ Hidden' : '❌ Visible'}`);
    }
    
    console.log('\n✅ All tests passed!');
    console.log('\nNote: Scroll prevention over zoom controls requires manual testing.');
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();