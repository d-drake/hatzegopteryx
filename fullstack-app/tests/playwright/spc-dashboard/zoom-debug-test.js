const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Enable console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('Waiting for charts to load...');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Add debug logging to the page
    await page.evaluate(() => {
      // Override addEventListener to log wheel events
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'wheel') {
          console.log('Wheel event listener added to:', this.tagName || this.className || this);
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    });
    
    // Find first chart and switch to Variability
    const chartContainers = await page.$$('div.bg-white.rounded-lg.shadow');
    const firstChartContainer = chartContainers[0];
    
    console.log('Switching to Variability tab...');
    const variabilityTab = await firstChartContainer.$('button:has-text("Variability")');
    await variabilityTab.click();
    await page.waitForTimeout(2000);
    
    // Check what elements have wheel listeners
    const wheelListenerInfo = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const elementsWithWheel = [];
      
      elements.forEach(el => {
        // This is a bit hacky but we can check if elements have certain properties
        if (el.tagName === 'SVG' || el.className?.includes('chart')) {
          elementsWithWheel.push({
            tag: el.tagName,
            className: el.className?.toString() || '',
            id: el.id || '',
            hasWheelListener: typeof el.onwheel === 'function'
          });
        }
      });
      
      return elementsWithWheel;
    });
    
    console.log('Elements that might have wheel listeners:', wheelListenerInfo);
    
    // Try to trigger wheel event and see what happens
    console.log('\nAttempting to trigger wheel event...');
    
    // Get SVG bounds
    const svgBounds = await firstChartContainer.evaluate((el) => {
      const svg = el.querySelector('svg.variability-chart');
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    
    if (svgBounds) {
      // Move to Y-axis area
      const yAxisX = svgBounds.x + 35;
      const yAxisY = svgBounds.y + svgBounds.height / 2;
      
      console.log(`Moving to: ${yAxisX}, ${yAxisY}`);
      await page.mouse.move(yAxisX, yAxisY);
      
      // Add logging for wheel events
      await page.evaluate(() => {
        document.addEventListener('wheel', (e) => {
          console.log('Wheel event detected!', {
            target: e.target.tagName,
            deltaY: e.deltaY,
            clientX: e.clientX,
            clientY: e.clientY,
            defaultPrevented: e.defaultPrevented
          });
        }, { capture: true });
      });
      
      await page.waitForTimeout(500);
      
      // Trigger wheel
      console.log('Triggering wheel event...');
      await page.mouse.wheel(0, -240);
      await page.waitForTimeout(1000);
      
      // Check if yDomain state changed
      const domainInfo = await page.evaluate(() => {
        // Try to access React component state (this is hacky but useful for debugging)
        const container = document.querySelector('.variability-chart-container');
        const reactKey = Object.keys(container || {}).find(key => key.startsWith('__react'));
        
        return {
          reactFound: !!reactKey,
          containerFound: !!container
        };
      });
      
      console.log('React component info:', domainInfo);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Keep browser open for inspection
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();