const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Enable console logging for VariabilityChart messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('VariabilityChart')) {
        console.log('Browser:', text);
      }
    });
    
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Switch to Variability tab on first chart
    console.log('Clicking Variability tab...');
    await page.click('div.bg-white.rounded-lg.shadow:first-child button:has-text("Variability")');
    await page.waitForTimeout(3000);
    
    // Get initial Y-axis values
    const initialValues = await page.evaluate(() => {
      const firstChart = document.querySelector('div.bg-white.rounded-lg.shadow');
      const yAxis = firstChart?.querySelector('g[transform="translate(0,0)"]');
      if (!yAxis) return null;
      
      const ticks = yAxis.querySelectorAll('.tick text');
      return Array.from(ticks).map(t => t.textContent);
    });
    console.log('Initial Y-axis tick labels:', initialValues);
    
    // Trigger wheel event
    await page.evaluate(() => {
      const svg = document.querySelector('svg.variability-chart');
      if (svg) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -240,
          clientX: 119,
          clientY: 1022,
          bubbles: true,
          cancelable: true
        });
        svg.dispatchEvent(wheelEvent);
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Get Y-axis values after zoom
    const zoomedValues = await page.evaluate(() => {
      const firstChart = document.querySelector('div.bg-white.rounded-lg.shadow');
      const yAxis = firstChart?.querySelector('g[transform="translate(0,0)"]');
      if (!yAxis) return null;
      
      const ticks = yAxis.querySelectorAll('.tick text');
      return Array.from(ticks).map(t => t.textContent);
    });
    console.log('Zoomed Y-axis tick labels:', zoomedValues);
    
    // Switch back to Timeline
    console.log('\nSwitching back to Timeline...');
    await page.click('div.bg-white.rounded-lg.shadow:first-child button:has-text("Timeline")');
    await page.waitForTimeout(2000);
    
    // Get Timeline Y-axis values
    const timelineValues = await page.evaluate(() => {
      const firstChart = document.querySelector('div.bg-white.rounded-lg.shadow');
      const yAxis = firstChart?.querySelector('g.y-axis, g[transform]:not([transform*=","])');
      if (!yAxis) return null;
      
      const ticks = yAxis.querySelectorAll('.tick text');
      return Array.from(ticks).map(t => t.textContent);
    });
    console.log('Timeline Y-axis tick labels after sync:', timelineValues);
    
    // Take screenshots
    await page.screenshot({ path: '~/tmp/tests/playwright_png/zoom-test-final.png' });
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();