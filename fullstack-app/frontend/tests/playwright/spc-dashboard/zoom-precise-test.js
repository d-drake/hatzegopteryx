const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Enable all console logging
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('Waiting for charts to load...');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Find first chart and switch to Variability
    const chartContainers = await page.$$('div.bg-white.rounded-lg.shadow');
    const firstChartContainer = chartContainers[0];
    
    console.log('Switching to Variability tab...');
    const variabilityTab = await firstChartContainer.$('button:has-text("Variability")');
    await variabilityTab.click();
    await page.waitForTimeout(2000);
    
    // Get detailed SVG structure
    const svgStructure = await firstChartContainer.evaluate((el) => {
      const svg = el.querySelector('svg.variability-chart');
      if (!svg) return { error: 'SVG not found' };
      
      const rect = svg.getBoundingClientRect();
      const g = svg.querySelector('g[transform]');
      const gTransform = g ? g.getAttribute('transform') : null;
      
      // Find the Y-axis zoom rect
      const zoomRect = svg.querySelector('rect[style*="ns-resize"]');
      const zoomRectBounds = zoomRect ? zoomRect.getBoundingClientRect() : null;
      
      // Parse transform to get margins
      const match = gTransform ? gTransform.match(/translate\(([^,]+),([^)]+)\)/) : null;
      const marginLeft = match ? parseFloat(match[1]) : 0;
      const marginTop = match ? parseFloat(match[2]) : 0;
      
      return {
        svg: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        transform: gTransform,
        margins: { left: marginLeft, top: marginTop },
        zoomRect: zoomRectBounds ? {
          x: zoomRectBounds.x,
          y: zoomRectBounds.y,
          width: zoomRectBounds.width,
          height: zoomRectBounds.height
        } : null
      };
    });
    
    console.log('SVG Structure:', JSON.stringify(svgStructure, null, 2));
    
    if (svgStructure.zoomRect) {
      // Move to the center of the zoom rect
      const zoomX = svgStructure.zoomRect.x + svgStructure.zoomRect.width / 2;
      const zoomY = svgStructure.zoomRect.y + svgStructure.zoomRect.height / 2;
      
      console.log(`Moving to zoom rect center: ${zoomX}, ${zoomY}`);
      await page.mouse.move(zoomX, zoomY);
      await page.waitForTimeout(500);
      
      // Check cursor
      const cursor = await page.evaluate(() => {
        const el = document.elementFromPoint(
          window.innerWidth / 2 - 600, // Approximate position
          window.innerHeight / 2
        );
        return el ? window.getComputedStyle(el).cursor : 'unknown';
      });
      console.log('Cursor at position:', cursor);
      
      // Try wheel at exact position
      console.log('Performing wheel events at zoom rect...');
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, -50);
        await page.waitForTimeout(100);
      }
      
      await page.waitForTimeout(1000);
    } else {
      // Try using the SVG margins approach
      const targetX = svgStructure.svg.x + svgStructure.margins.left / 2;
      const targetY = svgStructure.svg.y + svgStructure.margins.top + 150;
      
      console.log(`Moving to calculated position: ${targetX}, ${targetY}`);
      await page.mouse.move(targetX, targetY);
      await page.waitForTimeout(500);
      
      console.log('Performing wheel events...');
      await page.mouse.wheel(0, -240);
      await page.waitForTimeout(1000);
    }
    
    // Check final Y-axis domain
    const finalDomain = await firstChartContainer.evaluate((el) => {
      const yAxis = el.querySelector('g[transform="translate(0,0)"]');
      if (!yAxis) return null;
      
      const ticks = yAxis.querySelectorAll('.tick text');
      const values = Array.from(ticks)
        .map(t => parseFloat(t.textContent))
        .filter(v => !isNaN(v));
      
      return values.length > 0 ? {
        min: Math.min(...values),
        max: Math.max(...values),
        values: values
      } : null;
    });
    
    console.log('Final Y-axis domain:', finalDomain);
    
    // Take a screenshot
    await firstChartContainer.screenshot({ 
      path: '~/tmp/tests/playwright_png/variability-chart-zoom-attempt.png' 
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('Test completed. Browser will close in 3 seconds...');
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();