const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('Browser log:', msg.text());
    }
  });
  
  try {
    console.log('=== Debug Zoom Callbacks ===\n');
    
    // Add custom logging to detect zoom events
    await page.addInitScript(() => {
      // Override console methods to catch zoom events
      const originalLog = console.log;
      console.log = (...args) => {
        // Forward to original console
        originalLog.apply(console, args);
        
        // Check for zoom-related logs
        const logText = args.join(' ');
        if (logText.includes('zoom') || logText.includes('Zoom') || logText.includes('domain')) {
          originalLog('[ZOOM EVENT]', logText);
        }
      };
    });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Set viewport for side-by-side mode
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Check zoom controls existence
    const zoomControlsInfo = await page.evaluate(() => {
      const controls = document.querySelectorAll('.zoom-controls');
      const xAreas = document.querySelectorAll('rect[style*="cursor: ew-resize"]');
      const yAreas = document.querySelectorAll('rect[style*="cursor: ns-resize"]');
      
      return {
        controlsCount: controls.length,
        xAreasCount: xAreas.length,
        yAreasCount: yAreas.length,
        xAreaDetails: Array.from(xAreas).map((area, i) => ({
          index: i,
          x: area.getAttribute('x'),
          y: area.getAttribute('y'),
          width: area.getAttribute('width'),
          height: area.getAttribute('height'),
          style: area.getAttribute('style')
        }))
      };
    });
    
    console.log('Zoom controls info:', zoomControlsInfo);
    
    // Try to zoom on the first X-axis area
    if (zoomControlsInfo.xAreasCount > 0) {
      console.log('\nAttempting to zoom X-axis...');
      
      const xArea = await page.locator('rect[style*="cursor: ew-resize"]').first();
      const box = await xArea.boundingBox();
      
      if (box) {
        console.log(`  X-axis area box: x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}`);
        
        // Move to center of X-axis area
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        console.log(`  Moving mouse to: ${centerX}, ${centerY}`);
        
        await page.mouse.move(centerX, centerY);
        await page.waitForTimeout(500);
        
        // Try multiple strong scroll events
        console.log('  Scrolling...');
        for (let i = 0; i < 5; i++) {
          await page.mouse.wheel(0, -100);
          await page.waitForTimeout(100);
        }
        
        await page.waitForTimeout(1000);
        
        // Check zoom level
        const zoomLevel = await page.locator('.zoom-level').first().textContent();
        console.log(`  Zoom level after scroll: ${zoomLevel}`);
      }
    }
    
    // Check if wheel events are being captured
    console.log('\nChecking event listeners...');
    const eventInfo = await page.evaluate(() => {
      const chartContainers = document.querySelectorAll('[data-chart-id]');
      const eventListeners = [];
      
      chartContainers.forEach((container, i) => {
        // Check if container has wheel event listeners
        const hasWheelListener = container._addEventListener || 
                                container.onwheel !== null ||
                                getEventListeners(container).wheel?.length > 0;
        
        eventListeners.push({
          index: i,
          id: container.getAttribute('data-chart-id'),
          hasWheelListener: !!hasWheelListener
        });
      });
      
      return {
        containerCount: chartContainers.length,
        eventListeners
      };
    });
    
    console.log('Event info:', eventInfo);
    
    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `~/tmp/tests/playwright_png/debug-zoom-callbacks-${timestamp}.png`,
      fullPage: false
    });
    
    console.log('\nScreenshot saved. Browser will remain open...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await browser.close();
  }
})();