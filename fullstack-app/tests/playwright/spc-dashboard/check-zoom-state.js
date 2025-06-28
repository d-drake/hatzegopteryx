const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== Checking Zoom State ===\n');
    
    // Set viewport and navigate
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    console.log('Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Check what's on the page
    const pageInfo = await page.evaluate(() => {
      const charts = document.querySelectorAll('div.bg-white.rounded-lg.shadow');
      const svgs = document.querySelectorAll('svg');
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent);
      
      return {
        chartCount: charts.length,
        svgCount: svgs.length,
        buttons: buttons.filter(b => b).slice(0, 20), // First 20 buttons
        firstChartInfo: charts[0] ? {
          hasTimeline: !!charts[0].querySelector('.timeline-chart'),
          hasVariability: !!charts[0].querySelector('.variability-chart'),
          svgClasses: Array.from(charts[0].querySelectorAll('svg')).map(s => s.className.baseVal || s.className)
        } : null
      };
    });
    
    console.log('Page info:', JSON.stringify(pageInfo, null, 2));
    
    // Try to find and test the first chart
    console.log('\nTesting first chart...');
    
    // Look for Timeline/Variability tabs
    const tabs = await page.$$('button:has-text("Timeline"), button:has-text("Variability")');
    console.log(`Found ${tabs.length} tab buttons`);
    
    if (tabs.length >= 2) {
      // Click Variability tab
      console.log('Clicking Variability tab...');
      await tabs[1].click(); // Assuming second is Variability
      await page.waitForTimeout(2000);
      
      // Check if VariabilityChart loaded
      const varChartInfo = await page.evaluate(() => {
        const varChart = document.querySelector('.variability-chart');
        const zoomControls = document.querySelector('.zoom-controls');
        return {
          hasVariabilityChart: !!varChart,
          hasZoomControls: !!zoomControls,
          zoomControlsText: zoomControls?.textContent
        };
      });
      
      console.log('Variability chart info:', varChartInfo);
      
      // Try to zoom
      console.log('\nAttempting zoom...');
      await page.evaluate(() => {
        const svg = document.querySelector('svg.variability-chart');
        if (svg) {
          console.log('Found variability SVG, dispatching wheel event...');
          const rect = svg.getBoundingClientRect();
          const wheelEvent = new WheelEvent('wheel', {
            deltaY: -240,
            clientX: rect.left + 35,
            clientY: rect.top + rect.height / 2,
            bubbles: true,
            cancelable: true
          });
          svg.dispatchEvent(wheelEvent);
        }
      });
      
      await page.waitForTimeout(2000);
      
      // Check zoom state again
      const zoomState = await page.evaluate(() => {
        const zoomControls = document.querySelector('.zoom-controls');
        return {
          zoomControlsText: zoomControls?.textContent,
          hasResetButton: !!document.querySelector('button:has-text("Reset Zoom")')
        };
      });
      
      console.log('Zoom state after wheel:', zoomState);
    }
    
    console.log('\nKeeping browser open for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();