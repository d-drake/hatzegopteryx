const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser log:', msg.text());
  });
  
  try {
    console.log('=== Test Zoom With Delay ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for initial load
    
    // Set viewport for side-by-side mode
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(3000); // Extra wait for event listeners to be set up
    
    console.log('Attempting zoom on X-axis...');
    
    // Get the first SVG element
    const svgBox = await page.locator('svg').first().boundingBox();
    
    if (svgBox) {
      // Move to bottom of SVG (X-axis area)
      const xAxisY = svgBox.y + svgBox.height - 30;
      const xAxisX = svgBox.x + svgBox.width / 2;
      
      console.log(`Moving to X-axis area: ${xAxisX}, ${xAxisY}`);
      await page.mouse.move(xAxisX, xAxisY);
      await page.waitForTimeout(500);
      
      // Try scrolling multiple times
      console.log('Scrolling to zoom...');
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, -50);
        await page.waitForTimeout(100);
      }
      
      await page.waitForTimeout(1000);
      
      // Check zoom level
      const zoomLevel = await page.locator('.zoom-level').first().textContent();
      console.log(`Zoom level after X-axis scroll: ${zoomLevel}`);
      
      // Try Y-axis zoom
      console.log('\nAttempting zoom on Y-axis...');
      
      // Move to left side of chart (Y-axis area)
      const yAxisX = svgBox.x - 30;
      const yAxisY = svgBox.y + svgBox.height / 2;
      
      console.log(`Moving to Y-axis area: ${yAxisX}, ${yAxisY}`);
      await page.mouse.move(yAxisX, yAxisY);
      await page.waitForTimeout(500);
      
      // Scroll to zoom
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, -50);
        await page.waitForTimeout(100);
      }
      
      await page.waitForTimeout(1000);
      
      const zoomLevel2 = await page.locator('.zoom-level').first().textContent();
      console.log(`Zoom level after Y-axis scroll: ${zoomLevel2}`);
    }
    
    console.log('\nBrowser will remain open for manual testing...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();