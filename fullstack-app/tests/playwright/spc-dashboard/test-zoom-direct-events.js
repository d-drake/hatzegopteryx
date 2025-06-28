const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('Zoom event detected') || 
        msg.text().includes('Setting X domain') ||
        msg.text().includes('SPCChartWrapper')) {
      console.log('🔍', msg.text());
    }
  });
  
  try {
    console.log('=== Test Zoom Direct Events ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(5000);
    
    // Set viewport for side-by-side mode
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Dispatch wheel events directly on the X-axis area
    console.log('Testing X-axis zoom with direct wheel events...');
    const xZoomResult = await page.evaluate(() => {
      // Find the first X-axis zoom area
      const xAxisArea = document.querySelector('rect[style*="cursor: ew-resize"]');
      if (!xAxisArea) return { error: 'No X-axis area found' };
      
      const rect = xAxisArea.getBoundingClientRect();
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      
      // Create and dispatch wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: centerX,
        clientY: centerY,
        bubbles: true,
        cancelable: true
      });
      
      // Find the parent container and dispatch on it
      const container = xAxisArea.closest('[data-chart-id]');
      if (container) {
        container.dispatchEvent(wheelEvent);
        return { success: true, dispatched: 'on container', x: centerX, y: centerY };
      } else {
        xAxisArea.dispatchEvent(wheelEvent);
        return { success: true, dispatched: 'on rect', x: centerX, y: centerY };
      }
    });
    
    console.log('X-axis zoom result:', xZoomResult);
    await page.waitForTimeout(1000);
    
    // Check zoom level
    const zoomLevel1 = await page.locator('.zoom-level').first().textContent();
    console.log('Zoom level after X-axis event:', zoomLevel1);
    
    // Try multiple events
    console.log('\nTrying multiple wheel events...');
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        const xAxisArea = document.querySelector('rect[style*="cursor: ew-resize"]');
        if (!xAxisArea) return;
        
        const rect = xAxisArea.getBoundingClientRect();
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -100,
          clientX: rect.x + rect.width / 2,
          clientY: rect.y + rect.height / 2,
          bubbles: true,
          cancelable: true
        });
        
        const container = xAxisArea.closest('[data-chart-id]');
        if (container) {
          container.dispatchEvent(wheelEvent);
        }
      });
      await page.waitForTimeout(200);
    }
    
    const zoomLevel2 = await page.locator('.zoom-level').first().textContent();
    console.log('Zoom level after multiple events:', zoomLevel2);
    
    // Test Y-axis zoom
    console.log('\nTesting Y-axis zoom...');
    const yZoomResult = await page.evaluate(() => {
      const yAxisArea = document.querySelector('rect[style*="cursor: ns-resize"]');
      if (!yAxisArea) return { error: 'No Y-axis area found' };
      
      const rect = yAxisArea.getBoundingClientRect();
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: centerX,
        clientY: centerY,
        bubbles: true,
        cancelable: true
      });
      
      const container = yAxisArea.closest('[data-chart-id]');
      if (container) {
        container.dispatchEvent(wheelEvent);
        return { success: true, x: centerX, y: centerY };
      }
      return { error: 'No container found' };
    });
    
    console.log('Y-axis zoom result:', yZoomResult);
    await page.waitForTimeout(1000);
    
    const zoomLevel3 = await page.locator('.zoom-level').first().textContent();
    console.log('Final zoom level:', zoomLevel3);
    
    console.log('\nBrowser will remain open for manual testing...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();