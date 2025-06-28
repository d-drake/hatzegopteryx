const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('Wheel event') || msg.text().includes('zoom')) {
        console.log('Browser:', msg.text());
      }
    });
    
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
    
    // Add event logging
    await page.evaluate(() => {
      console.log('Setting up wheel event logging...');
      
      // Log all wheel events
      document.addEventListener('wheel', (e) => {
        console.log('Document wheel event:', {
          target: e.target.tagName + (e.target.className ? '.' + e.target.className : ''),
          x: e.clientX,
          y: e.clientY,
          deltaY: e.deltaY,
          prevented: e.defaultPrevented
        });
      }, { capture: true, passive: false });
      
      // Find SVG and log its properties
      const svg = document.querySelector('svg.variability-chart');
      if (svg) {
        console.log('SVG found:', {
          width: svg.getAttribute('width'),
          height: svg.getAttribute('height'),
          className: svg.className.baseVal
        });
        
        // Check if it has event listeners
        svg.addEventListener('wheel', (e) => {
          console.log('SVG wheel event fired!', e.deltaY);
        });
      }
    });
    
    // Get SVG element in the first chart container
    const svgInfo = await firstChartContainer.evaluate((el) => {
      const svg = el.querySelector('svg.variability-chart');
      if (!svg) return { found: false };
      
      const rect = svg.getBoundingClientRect();
      const containerRect = el.getBoundingClientRect();
      
      // Find Y-axis rect
      const yAxisRect = svg.querySelector('rect[style*="ns-resize"]');
      const yAxisRectInfo = yAxisRect ? {
        x: yAxisRect.getAttribute('x'),
        y: yAxisRect.getAttribute('y'),
        width: yAxisRect.getAttribute('width'),
        height: yAxisRect.getAttribute('height')
      } : null;
      
      return {
        found: true,
        svg: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        container: { x: containerRect.x, y: containerRect.y },
        margin: { left: 70 }, // From the code
        yAxisRect: yAxisRectInfo
      };
    });
    
    console.log('SVG info:', JSON.stringify(svgInfo, null, 2));
    
    if (svgInfo.found) {
      // Calculate Y-axis area position
      const yAxisX = svgInfo.svg.x + 35; // Middle of left margin
      const yAxisY = svgInfo.svg.y + svgInfo.svg.height / 2;
      
      console.log(`Moving to Y-axis area: ${yAxisX}, ${yAxisY}`);
      await page.mouse.move(yAxisX, yAxisY);
      await page.waitForTimeout(500);
      
      // Try multiple wheel events
      console.log('Triggering wheel events...');
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(200);
      }
      
      await page.waitForTimeout(1000);
      
      // Check if Y-axis changed
      const newDomain = await firstChartContainer.evaluate((el) => {
        const yAxis = el.querySelector('g[transform="translate(0,0)"]');
        if (!yAxis) return null;
        
        const ticks = yAxis.querySelectorAll('.tick text');
        const values = Array.from(ticks)
          .map(t => parseFloat(t.textContent))
          .filter(v => !isNaN(v));
        
        return values.length > 0 ? { min: Math.min(...values), max: Math.max(...values) } : null;
      });
      
      console.log('Y-axis domain after zoom attempts:', newDomain);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('Test completed. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();