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
    console.log('=== Verify Zoom Controls ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Set viewport for side-by-side mode
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Test 1: Default state
    console.log('1. Default state (no zoom)');
    let zoomControls = await page.locator('.zoom-controls').count();
    console.log(`   Zoom controls count: ${zoomControls}`);
    console.log(`   Status: ${zoomControls === 0 ? '✅ Hidden as expected' : '❌ Should be hidden'}`);
    
    // Take screenshot
    await page.screenshot({
      path: `~/tmp/tests/playwright_png/zoom-controls-default.png`,
      fullPage: false
    });
    
    // Test 2: After zooming
    console.log('\n2. After zooming X-axis');
    await dispatchWheelEvent(page, 'rect[style*="cursor: ew-resize"]', -200);
    await page.waitForTimeout(1000);
    
    zoomControls = await page.locator('.zoom-controls').count();
    const zoomLevel = await page.locator('.zoom-level').first().textContent().catch(() => 'Not found');
    console.log(`   Zoom controls count: ${zoomControls}`);
    console.log(`   Zoom level text: ${zoomLevel}`);
    console.log(`   Status: ${zoomControls > 0 ? '✅ Visible as expected' : '❌ Should be visible'}`);
    
    // Take screenshot
    await page.screenshot({
      path: `~/tmp/tests/playwright_png/zoom-controls-zoomed.png`,
      fullPage: false
    });
    
    // Test 3: After reset
    console.log('\n3. After reset');
    const resetButton = await page.locator('button:has-text("Reset Zoom")').first();
    if (await resetButton.count() > 0) {
      await resetButton.click();
      await page.waitForTimeout(1000);
      
      zoomControls = await page.locator('.zoom-controls').count();
      console.log(`   Zoom controls count: ${zoomControls}`);
      console.log(`   Status: ${zoomControls === 0 ? '✅ Hidden as expected' : '❌ Should be hidden'}`);
      
      // Take screenshot
      await page.screenshot({
        path: `~/tmp/tests/playwright_png/zoom-controls-reset.png`,
        fullPage: false
      });
    } else {
      console.log('   Reset button not found');
    }
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();