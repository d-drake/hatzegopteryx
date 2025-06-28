const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== Debug Charts ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(5000); // Wait longer for data to load
    
    // Check what's rendered
    const debug = await page.evaluate(() => {
      // Find all SVGs
      const svgs = document.querySelectorAll('svg');
      const charts = [];
      
      svgs.forEach((svg, i) => {
        const parent = svg.parentElement;
        const chartContainer = svg.closest('[data-chart-id]');
        const zoomControls = parent?.querySelector('.zoom-controls');
        
        charts.push({
          index: i,
          width: svg.getAttribute('width'),
          height: svg.getAttribute('height'),
          className: svg.getAttribute('class'),
          hasChartContainer: !!chartContainer,
          chartId: chartContainer?.getAttribute('data-chart-id'),
          hasZoomControls: !!zoomControls,
          parentClasses: parent?.className
        });
      });
      
      // Check for error messages
      const errors = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent.includes('Error') || 
        el.textContent.includes('error') ||
        el.textContent.includes('Failed')
      ).map(el => ({
        text: el.textContent.substring(0, 100),
        tag: el.tagName
      }));
      
      // Check for loading states
      const loading = document.querySelector('.animate-spin');
      
      // Check chart structure
      const bgWhite = document.querySelector('.bg-white.rounded-lg.shadow');
      const flexContainer = bgWhite?.querySelector('.flex.gap-\\[5px\\]');
      const tabButtons = bgWhite?.querySelectorAll('button');
      
      return {
        svgCount: svgs.length,
        charts,
        errors: errors.slice(0, 5), // First 5 errors
        isLoading: !!loading,
        hasBgWhite: !!bgWhite,
        hasFlexContainer: !!flexContainer,
        tabButtonCount: tabButtons?.length || 0,
        tabButtonTexts: tabButtons ? Array.from(tabButtons).map(b => b.textContent) : []
      };
    });
    
    console.log('Debug info:');
    console.log(`  SVG count: ${debug.svgCount}`);
    console.log(`  Loading: ${debug.isLoading}`);
    console.log(`  Has container: ${debug.hasBgWhite}`);
    console.log(`  Has flex container: ${debug.hasFlexContainer}`);
    console.log(`  Tab buttons: ${debug.tabButtonCount}`);
    
    if (debug.tabButtonTexts.length > 0) {
      console.log('  Tab texts:', debug.tabButtonTexts);
    }
    
    console.log('\nCharts:');
    debug.charts.forEach(chart => {
      console.log(`  Chart ${chart.index}:`, chart);
    });
    
    if (debug.errors.length > 0) {
      console.log('\nErrors found:');
      debug.errors.forEach(err => {
        console.log(`  ${err.tag}: ${err.text}`);
      });
    }
    
    // Try to manually trigger zoom
    console.log('\nTrying to find and interact with chart...');
    const manualTest = await page.evaluate(() => {
      const chartContainer = document.querySelector('[data-chart-id]');
      if (!chartContainer) return { error: 'No chart container found' };
      
      // Look for Timeline component
      const timelineChart = document.querySelector('.timeline-chart');
      const variabilityChart = document.querySelector('.variability-chart');
      
      return {
        hasChartContainer: !!chartContainer,
        hasTimelineChart: !!timelineChart,
        hasVariabilityChart: !!variabilityChart,
        chartId: chartContainer?.getAttribute('data-chart-id')
      };
    });
    
    console.log('Manual test:', manualTest);
    
    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `~/tmp/tests/playwright_png/debug-charts-${timestamp}.png`,
      fullPage: true
    });
    
    console.log('\nScreenshot saved. Browser will remain open...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await browser.close();
  }
})();