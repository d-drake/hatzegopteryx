const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== Debug Wheel Events ===\n');
    
    // Add a global wheel event listener to detect all wheel events
    await page.addInitScript(() => {
      let wheelCount = 0;
      document.addEventListener('wheel', (e) => {
        wheelCount++;
        console.log(`[WHEEL EVENT ${wheelCount}] target:`, e.target.tagName, 'class:', e.target.className, 'deltaY:', e.deltaY);
      }, true); // capture phase
    });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(5000); // Extra wait
    
    // Set viewport for side-by-side mode
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Enable console monitoring
    page.on('console', msg => {
      if (msg.text().includes('[WHEEL EVENT')) {
        console.log(msg.text());
      }
    });
    
    // Find SVG element
    const svgBox = await page.locator('svg').first().boundingBox();
    if (svgBox) {
      console.log('SVG found at:', svgBox);
      
      // Try scrolling in the middle of the chart
      const centerX = svgBox.x + svgBox.width / 2;
      const centerY = svgBox.y + svgBox.height / 2;
      
      console.log(`\nScrolling at center of chart: ${centerX}, ${centerY}`);
      await page.mouse.move(centerX, centerY);
      await page.waitForTimeout(500);
      
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(500);
      }
      
      // Try scrolling at the bottom (X-axis area)
      const bottomY = svgBox.y + svgBox.height - 30;
      console.log(`\nScrolling at bottom of chart: ${centerX}, ${bottomY}`);
      await page.mouse.move(centerX, bottomY);
      await page.waitForTimeout(500);
      
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(500);
      }
    }
    
    console.log('\nBrowser will remain open...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();