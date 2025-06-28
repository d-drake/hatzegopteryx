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
  
  // Add event listener to detect scroll events
  await page.addInitScript(() => {
    let scrollCount = 0;
    window.addEventListener('scroll', () => {
      scrollCount++;
      console.log(`[PAGE SCROLL ${scrollCount}] scrollY: ${window.scrollY}`);
    });
    
    // Also monitor wheel events on zoom controls
    const observer = new MutationObserver(() => {
      const zoomControls = document.querySelector('.zoom-controls');
      if (zoomControls && !zoomControls._wheelListenerAdded) {
        zoomControls._wheelListenerAdded = true;
        zoomControls.addEventListener('wheel', (e) => {
          console.log('[ZOOM CONTROLS WHEEL] prevented:', e.defaultPrevented, 'deltaY:', e.deltaY);
        }, true);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  
  // Monitor console
  page.on('console', msg => {
    if (msg.text().includes('[PAGE SCROLL') || msg.text().includes('[ZOOM CONTROLS WHEEL')) {
      console.log(msg.text());
    }
  });
  
  try {
    console.log('=== Manual Scroll Test ===\n');
    console.log('Instructions:');
    console.log('1. Chart will zoom automatically');
    console.log('2. Try scrolling over the zoom controls panel');
    console.log('3. Watch console for scroll events\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Set viewport
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Zoom the chart
    console.log('Zooming chart...');
    const zoomed = await zoomChart(page);
    if (zoomed) {
      console.log('✅ Chart zoomed - zoom controls should be visible\n');
    }
    
    await page.waitForTimeout(1000);
    
    // Get zoom controls position
    const zoomControlsInfo = await page.evaluate(() => {
      const controls = document.querySelector('.zoom-controls');
      if (!controls) return null;
      const rect = controls.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
    });
    
    if (zoomControlsInfo) {
      console.log('Zoom controls found at:', zoomControlsInfo);
      console.log('\nPlease manually test scrolling:');
      console.log('1. Scroll over the zoom controls panel');
      console.log('2. Scroll over the chart area');
      console.log('3. Scroll over empty areas\n');
    }
    
    console.log('Browser will remain open for testing...');
    await page.waitForTimeout(300000); // 5 minutes
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();