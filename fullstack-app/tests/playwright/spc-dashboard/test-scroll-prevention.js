const { chromium } = require('playwright');

// Helper to dispatch wheel event
async function zoomChart(page) {
  return await page.evaluate(() => {
    const xAxisArea = document.querySelector('rect[style*="cursor: ew-resize"]');
    if (!xAxisArea) return false;
    
    const rect = xAxisArea.getBoundingClientRect();
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -200,
      clientX: rect.x + rect.width / 2,
      clientY: rect.y + rect.height / 2,
      bubbles: true,
      cancelable: true
    });
    
    const container = xAxisArea.closest('[data-chart-id]');
    if (container) {
      container.dispatchEvent(wheelEvent);
      return true;
    }
    return false;
  });
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Add scroll event monitoring
  await page.addInitScript(() => {
    let scrollCount = 0;
    window.addEventListener('scroll', () => {
      scrollCount++;
      console.log(`[SCROLL ${scrollCount}] Page scrolled to Y: ${window.scrollY}`);
    });
  });
  
  // Monitor console for scroll events
  page.on('console', msg => {
    if (msg.text().includes('[SCROLL')) {
      console.log(msg.text());
    }
  });
  
  try {
    console.log('=== Test Scroll Prevention ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Set viewport for side-by-side mode
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Zoom the chart first
    await zoomChart(page);
    await page.waitForTimeout(1000);
    console.log('Chart zoomed - zoom controls should be visible\n');
    
    // Test 1: Scroll over Timeline chart area
    console.log('Test 1: Scrolling over Timeline chart area');
    const timelineSvg = await page.locator('svg').first().boundingBox();
    if (timelineSvg) {
      await page.mouse.move(timelineSvg.x + timelineSvg.width / 2, timelineSvg.y + timelineSvg.height / 2);
      
      console.log('  Attempting to scroll over Timeline...');
      const beforeScroll = await page.evaluate(() => window.scrollY);
      
      // Try to scroll
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 200); // Scroll down
        await page.waitForTimeout(100);
      }
      
      const afterScroll = await page.evaluate(() => window.scrollY);
      console.log(`  Before: ${beforeScroll}px, After: ${afterScroll}px`);
      console.log(`  Result: ${afterScroll === beforeScroll ? '✅ Scroll prevented' : '❌ Page scrolled'}\n`);
    }
    
    // Test 2: Scroll over Variability chart area
    console.log('Test 2: Scrolling over Variability chart area');
    const variabilitySvg = await page.locator('svg').nth(1).boundingBox();
    if (variabilitySvg) {
      await page.mouse.move(variabilitySvg.x + variabilitySvg.width / 2, variabilitySvg.y + variabilitySvg.height / 2);
      
      console.log('  Attempting to scroll over Variability chart...');
      const beforeScroll = await page.evaluate(() => window.scrollY);
      
      // Try to scroll
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 200); // Scroll down
        await page.waitForTimeout(100);
      }
      
      const afterScroll = await page.evaluate(() => window.scrollY);
      console.log(`  Before: ${beforeScroll}px, After: ${afterScroll}px`);
      console.log(`  Result: ${afterScroll === beforeScroll ? '✅ Scroll prevented' : '❌ Page scrolled'}\n`);
    }
    
    // Test 3: Scroll outside chart areas (should work)
    console.log('Test 3: Scrolling outside chart areas');
    await page.mouse.move(100, 100); // Move to top-left corner
    
    console.log('  Attempting to scroll outside charts...');
    const beforeNormalScroll = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy(0, 300));
    const afterNormalScroll = await page.evaluate(() => window.scrollY);
    
    console.log(`  Before: ${beforeNormalScroll}px, After: ${afterNormalScroll}px`);
    console.log(`  Result: ${afterNormalScroll > beforeNormalScroll ? '✅ Normal scrolling works' : '❌ Scrolling blocked'}\n`);
    
    console.log('Browser will remain open for manual testing...');
    console.log('Try scrolling with your mouse wheel over different chart areas.');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();