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
    console.log('=== Debug Zoom Calculation ===\n');
    
    // Inject debugging into Timeline component
    await page.addInitScript(() => {
      // Override console methods to track zoom calculations
      const originalLog = console.log;
      window.debugLogs = [];
      
      console.log = (...args) => {
        window.debugLogs.push(args.join(' '));
        originalLog(...args);
      };
    });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Set to side-by-side mode
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    console.log('1. Initial state:');
    const initialState = await page.evaluate(() => {
      const zoomControls = document.querySelector('.zoom-controls');
      const zoomLevel = zoomControls?.querySelector('.zoom-level')?.textContent;
      
      // Find the Timeline chart container
      const timelineContainer = document.querySelector('[data-chart-id]');
      const rect = timelineContainer?.getBoundingClientRect();
      
      return {
        zoomLevel,
        containerFound: !!timelineContainer,
        containerRect: rect ? { 
          left: rect.left, 
          top: rect.top, 
          width: rect.width, 
          height: rect.height 
        } : null,
        chartId: timelineContainer?.getAttribute('data-chart-id')
      };
    });
    console.log('  Initial zoom:', initialState.zoomLevel);
    console.log('  Container found:', initialState.containerFound);
    console.log('  Container rect:', initialState.containerRect);
    console.log('  Chart ID:', initialState.chartId);
    
    // Inject zoom debugging
    await page.evaluate(() => {
      const container = document.querySelector('[data-chart-id]');
      if (!container) {
        console.log('No chart container found');
        return;
      }
      
      // Add our own wheel listener to debug
      container.addEventListener('wheel', (e) => {
        const rect = container.getBoundingClientRect();
        const svg = container.querySelector('svg');
        const svgRect = svg?.getBoundingClientRect();
        
        console.log('Wheel event:', {
          clientX: e.clientX,
          clientY: e.clientY,
          deltaY: e.deltaY,
          containerRect: { left: rect.left, top: rect.top },
          svgRect: svgRect ? { left: svgRect.left, top: svgRect.top } : null,
          relativeX: e.clientX - rect.left,
          relativeY: e.clientY - rect.top
        });
      }, { passive: true });
    });
    
    console.log('\n2. Attempting X-axis zoom:');
    
    // Find and zoom X-axis
    const xAxisArea = await page.locator('rect[style*="cursor: ew-resize"]').first();
    const xBox = await xAxisArea.boundingBox();
    
    if (xBox) {
      console.log('  X-axis area found:', xBox);
      
      // Move to center of X-axis area
      const centerX = xBox.x + xBox.width / 2;
      const centerY = xBox.y + xBox.height / 2;
      console.log(`  Moving to: (${centerX}, ${centerY})`);
      
      await page.mouse.move(centerX, centerY);
      await page.waitForTimeout(500);
      
      // Perform zoom
      console.log('  Scrolling to zoom...');
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(1000);
      
      // Check zoom level
      const afterZoom = await page.locator('.zoom-level').first().textContent();
      console.log('  After zoom:', afterZoom);
      
      // Get debug logs
      const logs = await page.evaluate(() => window.debugLogs || []);
      if (logs.length > 0) {
        console.log('\n  Debug logs from browser:');
        logs.forEach(log => console.log('    ', log));
      }
    } else {
      console.log('  X-axis area not found!');
    }
    
    // Check if zoom areas are properly positioned
    console.log('\n3. Checking zoom areas:');
    const zoomAreas = await page.evaluate(() => {
      const areas = document.querySelectorAll('rect[style*="cursor"]');
      return Array.from(areas).map((area, i) => {
        const rect = area.getBoundingClientRect();
        const style = area.getAttribute('style');
        return {
          index: i,
          cursor: style?.match(/cursor:\s*([^;]+)/)?.[1],
          rect: { 
            left: rect.left, 
            top: rect.top, 
            width: rect.width, 
            height: rect.height 
          },
          visible: rect.width > 0 && rect.height > 0
        };
      });
    });
    
    console.log(`  Found ${zoomAreas.length} zoom areas:`);
    zoomAreas.forEach(area => {
      console.log(`    Area ${area.index}: cursor=${area.cursor}, visible=${area.visible}, rect=`, area.rect);
    });
    
    console.log('\nBrowser will remain open for inspection...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await browser.close();
  }
})();