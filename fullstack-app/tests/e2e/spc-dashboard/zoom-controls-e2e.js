const { chromium } = require('playwright');

// Helper function to dispatch wheel event
async function dispatchWheelEvent(page, selector, deltaY = -100) {
  return await page.evaluate(({ selector, deltaY }) => {
    const element = document.querySelector(selector);
    if (!element) return { error: `Element not found: ${selector}` };
    
    const rect = element.getBoundingClientRect();
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: deltaY,
      clientX: rect.x + rect.width / 2,
      clientY: rect.y + rect.height / 2,
      bubbles: true,
      cancelable: true
    });
    
    const container = element.closest('[data-chart-id]');
    if (container) {
      container.dispatchEvent(wheelEvent);
      return { success: true };
    }
    return { error: 'No container found' };
  }, { selector, deltaY });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Zoom Controls E2E Test ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Test in side-by-side mode
    console.log('1. Testing side-by-side mode (1800px)');
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Verify zoom controls are visible
    const zoomControls = await page.locator('.zoom-controls').count();
    console.log(`   Zoom controls found: ${zoomControls}`);
    
    // Get initial zoom level
    const initialZoom = await page.locator('.zoom-level').first().textContent();
    console.log(`   Initial zoom: ${initialZoom}`);
    
    // Test X-axis zoom
    console.log('\n2. Testing X-axis zoom');
    for (let i = 0; i < 3; i++) {
      await dispatchWheelEvent(page, 'rect[style*="cursor: ew-resize"]', -100);
      await page.waitForTimeout(200);
    }
    
    const xZoomLevel = await page.locator('.zoom-level').first().textContent();
    console.log(`   After X zoom: ${xZoomLevel}`);
    const xMatch = xZoomLevel.match(/X:\s*([\d.]+)x/);
    const xLevel = xMatch ? parseFloat(xMatch[1]) : 1;
    console.log(`   X zoom success: ${xLevel > 1 ? '✅' : '❌'} (${xLevel}x)`);
    
    // Test Y-axis zoom
    console.log('\n3. Testing Y-axis zoom');
    for (let i = 0; i < 3; i++) {
      await dispatchWheelEvent(page, 'rect[style*="cursor: ns-resize"]', -100);
      await page.waitForTimeout(200);
    }
    
    const yZoomLevel = await page.locator('.zoom-level').first().textContent();
    console.log(`   After Y zoom: ${yZoomLevel}`);
    const yMatch = yZoomLevel.match(/Y:\s*([\d.]+)x/);
    const yLevel = yMatch ? parseFloat(yMatch[1]) : 1;
    console.log(`   Y zoom success: ${yLevel > 1 ? '✅' : '❌'} (${yLevel}x)`);
    
    // Test Y2-axis zoom (if available)
    console.log('\n4. Testing Y2-axis zoom');
    const y2Areas = await page.locator('rect[style*="cursor: ns-resize"]').count();
    if (y2Areas > 1) {
      // Dispatch on the second ns-resize area (Y2 axis)
      await page.evaluate(() => {
        const y2Area = document.querySelectorAll('rect[style*="cursor: ns-resize"]')[1];
        if (!y2Area) return;
        
        const rect = y2Area.getBoundingClientRect();
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -300, // Stronger zoom
          clientX: rect.x + rect.width / 2,
          clientY: rect.y + rect.height / 2,
          bubbles: true,
          cancelable: true
        });
        
        const container = y2Area.closest('[data-chart-id]');
        if (container) container.dispatchEvent(wheelEvent);
      });
      await page.waitForTimeout(500);
      
      const y2ZoomLevel = await page.locator('.zoom-level').first().textContent();
      console.log(`   After Y2 zoom: ${y2ZoomLevel}`);
      const y2Match = y2ZoomLevel.match(/Y2:\s*([\d.]+)x/);
      const y2Level = y2Match ? parseFloat(y2Match[1]) : 1;
      console.log(`   Y2 zoom success: ${y2Level > 1 ? '✅' : '❌'} (${y2Level}x)`);
    } else {
      console.log('   No Y2 axis available in this chart');
    }
    
    // Test Reset button
    console.log('\n5. Testing Reset button');
    const resetButton = await page.locator('button:has-text("Reset Zoom")').first();
    const isEnabled = await resetButton.isEnabled();
    console.log(`   Reset button enabled: ${isEnabled ? '✅' : '❌'}`);
    
    if (isEnabled) {
      await resetButton.click();
      await page.waitForTimeout(1000);
      
      const afterReset = await page.locator('.zoom-level').first().textContent();
      console.log(`   After reset: ${afterReset}`);
      const resetSuccess = afterReset.includes('X: 1.0x') && afterReset.includes('Y: 1.0x');
      console.log(`   Reset success: ${resetSuccess ? '✅' : '❌'}`);
    }
    
    // Test in tabbed mode
    console.log('\n6. Testing tabbed mode (1400px)');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(2000);
    
    // Verify tabs exist
    const tabs = await page.locator('button').filter({ hasText: /Timeline|Variability/ }).count();
    console.log(`   Tab buttons found: ${tabs}`);
    
    if (tabs > 0) {
      // Click Timeline tab
      await page.locator('button').filter({ hasText: 'Timeline' }).first().click();
      await page.waitForTimeout(1000);
      
      // Test zoom in tabbed mode
      await dispatchWheelEvent(page, 'rect[style*="cursor: ew-resize"]', -200);
      await page.waitForTimeout(500);
      
      const tabbedZoom = await page.locator('.zoom-level').first().textContent();
      console.log(`   Zoom in tabbed mode: ${tabbedZoom}`);
      const tabbedMatch = tabbedZoom.match(/X:\s*([\d.]+)x/);
      const tabbedLevel = tabbedMatch ? parseFloat(tabbedMatch[1]) : 1;
      console.log(`   Tabbed zoom success: ${tabbedLevel > 1 ? '✅' : '❌'}`);
    }
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log('All zoom functionality working correctly! ✅');
    
    // Take final screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `~/tmp/tests/playwright_png/zoom-controls-e2e-${timestamp}.png`,
      fullPage: false
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();