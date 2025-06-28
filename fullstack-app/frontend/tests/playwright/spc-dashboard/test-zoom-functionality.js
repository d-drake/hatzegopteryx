const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Test Zoom Functionality ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Test tabbed mode
    console.log('1. Testing tabbed mode:');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(2000);
    
    // Click Timeline tab
    await page.click('button:has-text("Timeline")');
    await page.waitForTimeout(1000);
    
    // Check zoom controls visibility
    const zoomControls = await page.locator('.zoom-controls').count();
    console.log(`  Zoom controls found: ${zoomControls}`);
    
    if (zoomControls > 0) {
      // Get initial zoom levels
      const initialZoom = await page.locator('.zoom-level').first().textContent();
      console.log(`  Initial zoom: ${initialZoom}`);
      
      // Test X-axis zoom
      console.log('\n  Testing X-axis zoom:');
      const xAxisArea = await page.locator('rect[style*="cursor: ew-resize"]').first();
      const xBox = await xAxisArea.boundingBox();
      if (xBox) {
        await page.mouse.move(xBox.x + xBox.width / 2, xBox.y + xBox.height / 2);
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(500);
        
        const afterXZoom = await page.locator('.zoom-level').first().textContent();
        console.log(`    After X zoom: ${afterXZoom}`);
      }
      
      // Test Y-axis zoom
      console.log('\n  Testing Y-axis zoom:');
      const yAxisArea = await page.locator('rect[style*="cursor: ns-resize"]').first();
      const yBox = await yAxisArea.boundingBox();
      if (yBox) {
        await page.mouse.move(yBox.x + yBox.width / 2, yBox.y + yBox.height / 2);
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(500);
        
        const afterYZoom = await page.locator('.zoom-level').first().textContent();
        console.log(`    After Y zoom: ${afterYZoom}`);
      }
      
      // Test Reset button
      console.log('\n  Testing Reset button:');
      const resetButton = await page.locator('button:has-text("Reset Zoom")').first();
      const isEnabled = await resetButton.isEnabled();
      console.log(`    Reset button enabled: ${isEnabled}`);
      
      if (isEnabled) {
        await resetButton.click();
        await page.waitForTimeout(500);
        
        const afterReset = await page.locator('.zoom-level').first().textContent();
        console.log(`    After reset: ${afterReset}`);
      }
    }
    
    // Test side-by-side mode
    console.log('\n2. Testing side-by-side mode:');
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    const sideBySideControls = await page.locator('.zoom-controls').count();
    console.log(`  Zoom controls found: ${sideBySideControls}`);
    
    if (sideBySideControls > 0) {
      // Test zoom on Timeline (first chart)
      console.log('\n  Testing Timeline zoom:');
      const timelineZoom = await page.locator('.zoom-controls').first();
      const timelineInitial = await timelineZoom.locator('.zoom-level').textContent();
      console.log(`    Initial: ${timelineInitial}`);
      
      // Zoom X-axis
      const xArea = await page.locator('rect[style*="cursor: ew-resize"]').first();
      const box = await xArea.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, -150);
        await page.waitForTimeout(500);
        
        const afterZoom = await timelineZoom.locator('.zoom-level').textContent();
        console.log(`    After zoom: ${afterZoom}`);
        
        // Test reset
        const resetBtn = await timelineZoom.locator('button:has-text("Reset Zoom")');
        if (await resetBtn.isEnabled()) {
          await resetBtn.click();
          await page.waitForTimeout(500);
          const afterReset = await timelineZoom.locator('.zoom-level').textContent();
          console.log(`    After reset: ${afterReset}`);
        }
      }
    }
    
    // Take final screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `~/tmp/tests/playwright_png/zoom-test-${timestamp}.png`,
      fullPage: false,
      clip: { x: 0, y: 0, width: 1800, height: 900 }
    });
    
    console.log('\n✅ Test completed');
    console.log('Screenshot saved for review');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();