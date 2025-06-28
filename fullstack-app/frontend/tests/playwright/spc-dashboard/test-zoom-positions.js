const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('Zoom event detected') || msg.text().includes('Setting X domain')) {
      console.log('🔍 Browser log:', msg.text());
    }
  });
  
  try {
    console.log('=== Test Zoom Positions ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Set viewport for side-by-side mode
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Get first chart container details
    const containerDetails = await page.evaluate(() => {
      const firstContainer = document.querySelector('[data-chart-id]');
      if (!firstContainer) return null;
      
      const rect = firstContainer.getBoundingClientRect();
      const svg = firstContainer.querySelector('svg');
      const svgRect = svg ? svg.getBoundingClientRect() : null;
      
      // Find x-axis area
      const xAxisArea = firstContainer.querySelector('rect[style*="cursor: ew-resize"]');
      const xAxisRect = xAxisArea ? xAxisArea.getBoundingClientRect() : null;
      
      return {
        container: {
          id: firstContainer.getAttribute('data-chart-id'),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        svg: svgRect ? {
          x: svgRect.x,
          y: svgRect.y,
          width: svgRect.width,
          height: svgRect.height
        } : null,
        xAxisArea: xAxisRect ? {
          x: xAxisRect.x,
          y: xAxisRect.y,
          width: xAxisRect.width,
          height: xAxisRect.height
        } : null
      };
    });
    
    console.log('Container details:', JSON.stringify(containerDetails, null, 2));
    
    if (containerDetails && containerDetails.xAxisArea) {
      console.log('\nTrying to zoom on first chart X-axis...');
      
      // Move mouse to center of X-axis area
      const centerX = containerDetails.xAxisArea.x + containerDetails.xAxisArea.width / 2;
      const centerY = containerDetails.xAxisArea.y + containerDetails.xAxisArea.height / 2;
      
      console.log(`Moving mouse to: ${centerX}, ${centerY}`);
      await page.mouse.move(centerX, centerY);
      await page.waitForTimeout(500);
      
      // Try scrolling
      console.log('Scrolling...');
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(200);
      }
      
      await page.waitForTimeout(1000);
      
      // Check zoom level
      const zoomLevel = await page.locator('.zoom-level').first().textContent();
      console.log(`Zoom level after scroll: ${zoomLevel}`);
    }
    
    // Try directly on the SVG element
    console.log('\nTrying direct SVG interaction...');
    const svgElement = await page.locator('svg').first();
    const svgBox = await svgElement.boundingBox();
    
    if (svgBox) {
      // Try at the bottom of the SVG (where X-axis should be)
      const xAxisY = svgBox.y + svgBox.height - 30;
      const xAxisX = svgBox.x + svgBox.width / 2;
      
      console.log(`Moving to bottom of SVG: ${xAxisX}, ${xAxisY}`);
      await page.mouse.move(xAxisX, xAxisY);
      await page.waitForTimeout(500);
      
      // Scroll
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(200);
      }
      
      await page.waitForTimeout(1000);
      
      const zoomLevel2 = await page.locator('.zoom-level').first().textContent();
      console.log(`Zoom level after SVG scroll: ${zoomLevel2}`);
    }
    
    console.log('\nBrowser will remain open for manual testing...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();