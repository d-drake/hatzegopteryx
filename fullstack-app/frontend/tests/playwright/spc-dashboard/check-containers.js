const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser log:', msg.text());
  });
  
  try {
    console.log('=== Check Containers ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for charts to render
    
    // Set viewport for side-by-side mode
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Check what containers exist
    const containerInfo = await page.evaluate(() => {
      const chartContainers = document.querySelectorAll('[data-chart-id]');
      const svgs = document.querySelectorAll('svg');
      const zoomControls = document.querySelectorAll('.zoom-controls');
      const timelineCharts = document.querySelectorAll('.timeline-chart');
      const variabilityCharts = document.querySelectorAll('.variability-chart');
      
      return {
        chartContainers: Array.from(chartContainers).map(c => ({
          id: c.getAttribute('data-chart-id'),
          className: c.className,
          tagName: c.tagName
        })),
        svgCount: svgs.length,
        zoomControlsCount: zoomControls.length,
        timelineChartsCount: timelineCharts.length,
        variabilityChartsCount: variabilityCharts.length
      };
    });
    
    console.log('Container info:', JSON.stringify(containerInfo, null, 2));
    
    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `~/tmp/tests/playwright_png/check-containers-${timestamp}.png`,
      fullPage: false
    });
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();