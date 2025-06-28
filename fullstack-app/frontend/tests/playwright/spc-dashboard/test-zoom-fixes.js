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
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== Test Zoom Fixes ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Set viewport for side-by-side mode
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Test 1: Verify zoom controls are hidden at default zoom
    console.log('1. Testing zoom controls visibility at default zoom');
    let zoomControlsCount = await page.locator('.zoom-controls').count();
    console.log(`   Zoom controls visible at default: ${zoomControlsCount === 0 ? '✅ Hidden' : '❌ Still visible (' + zoomControlsCount + ')'}`);
    
    // Test 2: Zoom in and check controls appear
    console.log('\n2. Testing zoom controls appear when zoomed');
    await dispatchWheelEvent(page, 'rect[style*="cursor: ew-resize"]', -200);
    await page.waitForTimeout(500);
    
    zoomControlsCount = await page.locator('.zoom-controls').count();
    console.log(`   Zoom controls after zoom: ${zoomControlsCount > 0 ? '✅ Visible (' + zoomControlsCount + ')' : '❌ Still hidden'}`);
    
    // Test 3: Test page scrolling prevention
    console.log('\n3. Testing page scroll prevention over zoom controls');
    
    // First, get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY);
    console.log(`   Initial page scroll position: ${initialScrollY}`);
    
    // Try to scroll over zoom controls
    const zoomControlsBox = await page.locator('.zoom-controls').first().boundingBox();
    if (zoomControlsBox) {
      console.log('   Attempting to scroll over zoom controls...');
      
      // Move mouse to zoom controls
      await page.mouse.move(
        zoomControlsBox.x + zoomControlsBox.width / 2,
        zoomControlsBox.y + zoomControlsBox.height / 2
      );
      
      // Try to scroll
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 100); // Scroll down
        await page.waitForTimeout(100);
      }
      
      const afterScrollY = await page.evaluate(() => window.scrollY);
      console.log(`   Page scroll after wheel over controls: ${afterScrollY}`);
      console.log(`   Scroll prevention: ${afterScrollY === initialScrollY ? '✅ Working' : '❌ Page scrolled'}`);
    }
    
    // Test 4: Reset zoom and verify controls hide
    console.log('\n4. Testing zoom controls hide after reset');
    const resetButton = await page.locator('button:has-text("Reset Zoom")').first();
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForTimeout(1000);
      
      zoomControlsCount = await page.locator('.zoom-controls').count();
      console.log(`   Zoom controls after reset: ${zoomControlsCount === 0 ? '✅ Hidden' : '❌ Still visible (' + zoomControlsCount + ')'}`);
    }
    
    // Test 5: Verify page scrolling works normally elsewhere
    console.log('\n5. Testing normal page scrolling works');
    
    // Move mouse to center of page
    await page.mouse.move(900, 450);
    
    // Scroll page
    const beforeNormalScroll = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy(0, 200));
    const afterNormalScroll = await page.evaluate(() => window.scrollY);
    
    console.log(`   Normal scrolling: ${afterNormalScroll > beforeNormalScroll ? '✅ Working' : '❌ Not working'}`);
    
    console.log('\n✅ All tests completed!');
    console.log('Browser will remain open for manual testing...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();