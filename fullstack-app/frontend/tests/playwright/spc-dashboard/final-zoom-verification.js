const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser error:', msg.text());
    }
  });
  
  try {
    console.log('=== Final Zoom Verification ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(5000); // Wait for data to load
    
    // Test side-by-side mode
    console.log('1. Side-by-side mode (1800px):');
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(3000);
    
    // Check for charts
    const chartsInfo = await page.evaluate(() => {
      const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
      if (!flexContainer) return { mode: 'not-side-by-side' };
      
      const charts = Array.from(flexContainer.children);
      return {
        mode: 'side-by-side',
        chartCount: charts.length,
        hasTimeline: !!document.querySelector('.timeline-chart'),
        hasVariability: !!document.querySelector('.variability-chart'),
        zoomControlsCount: document.querySelectorAll('.zoom-controls').length,
        svgCount: document.querySelectorAll('svg').length
      };
    });
    
    console.log('  Mode:', chartsInfo.mode);
    console.log('  Charts:', chartsInfo.chartCount);
    console.log('  Has Timeline:', chartsInfo.hasTimeline);
    console.log('  Has Variability:', chartsInfo.hasVariability);
    console.log('  Zoom controls:', chartsInfo.zoomControlsCount);
    console.log('  SVGs:', chartsInfo.svgCount);
    
    if (chartsInfo.zoomControlsCount > 0) {
      // Get initial zoom state
      const initialZoom = await page.locator('.zoom-level').first().textContent();
      console.log('\n  Initial zoom:', initialZoom);
      
      // Test X-axis zoom
      console.log('\n  Testing X-axis zoom:');
      const xArea = await page.locator('rect[style*="cursor: ew-resize"]').first();
      if (await xArea.count() > 0) {
        const box = await xArea.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        
        // Multiple scroll events
        for (let i = 0; i < 3; i++) {
          await page.mouse.wheel(0, -100);
          await page.waitForTimeout(200);
        }
        
        const afterXZoom = await page.locator('.zoom-level').first().textContent();
        console.log('    After zoom:', afterXZoom);
        
        // Test Reset
        const resetButton = await page.locator('button:has-text("Reset Zoom")').first();
        if (await resetButton.isEnabled()) {
          await resetButton.click();
          await page.waitForTimeout(1000);
          const afterReset = await page.locator('.zoom-level').first().textContent();
          console.log('    After reset:', afterReset);
        }
      }
    }
    
    // Test tabbed mode
    console.log('\n2. Tabbed mode (1400px):');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(3000);
    
    const tabbedInfo = await page.evaluate(() => {
      const tabs = document.querySelectorAll('button');
      const tabTexts = Array.from(tabs).map(t => t.textContent).filter(t => t.includes('Timeline') || t.includes('Variability'));
      return {
        hasFlexContainer: !!document.querySelector('.flex.gap-\\[5px\\]'),
        tabCount: tabTexts.length,
        tabTexts: tabTexts
      };
    });
    
    console.log('  Has flex container:', tabbedInfo.hasFlexContainer);
    console.log('  Tab count:', tabbedInfo.tabCount);
    console.log('  Tab texts:', tabbedInfo.tabTexts);
    
    // Summary
    console.log('\n=== Summary ===');
    console.log('Side-by-side layout:', chartsInfo.mode === 'side-by-side' ? '✅ Working' : '❌ Not working');
    console.log('Zoom controls visible:', chartsInfo.zoomControlsCount > 0 ? '✅ Yes' : '❌ No');
    console.log('Charts rendered:', chartsInfo.svgCount > 0 ? '✅ Yes' : '❌ No');
    
    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `~/tmp/tests/playwright_png/final-zoom-verification-${timestamp}.png`,
      fullPage: false
    });
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();