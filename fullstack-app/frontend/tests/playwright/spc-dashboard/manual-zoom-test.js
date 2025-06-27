const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Enable all console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('VariabilityChart') || text.includes('Wheel')) {
        console.log('Browser:', text);
      }
    });
    
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('Waiting for page to load...');
    await page.waitForTimeout(5000); // Wait longer for everything to settle
    
    // Switch to Variability tab on first chart
    console.log('Clicking Variability tab...');
    await page.click('div.bg-white.rounded-lg.shadow:first-child button:has-text("Variability")');
    await page.waitForTimeout(3000);
    
    // Inject test code to manually trigger wheel event
    await page.evaluate(() => {
      const svg = document.querySelector('svg.variability-chart');
      if (svg) {
        console.log('Found SVG, dimensions:', svg.getAttribute('width'), 'x', svg.getAttribute('height'));
        
        // Create and dispatch a wheel event manually
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -240,
          clientX: 119,
          clientY: 1022,
          bubbles: true,
          cancelable: true
        });
        
        console.log('Dispatching wheel event to SVG...');
        svg.dispatchEvent(wheelEvent);
        
        // Also try on the document
        setTimeout(() => {
          console.log('Dispatching wheel event to document...');
          document.dispatchEvent(new WheelEvent('wheel', {
            deltaY: -240,
            clientX: 119,
            clientY: 1022,
            bubbles: true,
            cancelable: true
          }));
        }, 1000);
      } else {
        console.log('SVG not found!');
      }
    });
    
    await page.waitForTimeout(3000);
    
    // Check Y-axis
    const yAxisInfo = await page.evaluate(() => {
      const firstChart = document.querySelector('div.bg-white.rounded-lg.shadow');
      const yAxis = firstChart?.querySelector('g[transform="translate(0,0)"]');
      if (!yAxis) return 'No Y-axis found';
      
      const ticks = yAxis.querySelectorAll('.tick text');
      const values = Array.from(ticks).map(t => parseFloat(t.textContent));
      return { tickCount: values.length, min: Math.min(...values), max: Math.max(...values) };
    });
    
    console.log('Y-axis after manual wheel event:', yAxisInfo);
    
    console.log('\nTest complete. You can manually test zoom by:');
    console.log('1. Hovering over the left margin of the Variability chart');
    console.log('2. Using mouse wheel to zoom');
    console.log('3. Check console for "VariabilityChart:" messages');
    console.log('\nBrowser will stay open for manual testing...');
    
    // Keep browser open for manual testing
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();