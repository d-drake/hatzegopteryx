const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== Debug Zoom Controls ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Check tabbed mode
    console.log('1. Tabbed mode (1400px):');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(2000);
    
    // Click Timeline tab to ensure it's active
    await page.click('button:has-text("Timeline")');
    await page.waitForTimeout(1000);
    
    // Debug what's in the DOM
    const tabbedDebug = await page.evaluate(() => {
      const allZoomControls = document.querySelectorAll('.zoom-controls');
      const allZoomLevels = document.querySelectorAll('.zoom-level');
      const timelineChart = document.querySelector('.timeline-chart');
      const svgs = document.querySelectorAll('svg');
      
      // Look for zoom controls in different ways
      const divWithZoom = Array.from(document.querySelectorAll('div')).filter(div => 
        div.textContent.includes('Zoom:') || 
        div.className.includes('zoom')
      );
      
      return {
        zoomControlsCount: allZoomControls.length,
        zoomLevelCount: allZoomLevels.length,
        timelineChartExists: !!timelineChart,
        svgCount: svgs.length,
        divsWithZoom: divWithZoom.map(div => ({
          className: div.className,
          text: div.textContent.substring(0, 100)
        }))
      };
    });
    
    console.log('  Zoom controls found:', tabbedDebug.zoomControlsCount);
    console.log('  Zoom level elements:', tabbedDebug.zoomLevelCount);
    console.log('  Timeline chart exists:', tabbedDebug.timelineChartExists);
    console.log('  SVG count:', tabbedDebug.svgCount);
    console.log('  Divs with zoom text:', tabbedDebug.divsWithZoom.length);
    tabbedDebug.divsWithZoom.forEach(div => {
      console.log(`    - Class: "${div.className}", Text: "${div.text}"`);
    });
    
    // Check side-by-side mode
    console.log('\n2. Side-by-side mode (1800px):');
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    const sideBySideDebug = await page.evaluate(() => {
      const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
      if (!flexContainer) return { mode: 'not side-by-side' };
      
      const charts = Array.from(flexContainer.children);
      const chartsInfo = charts.map((chart, i) => {
        const svg = chart.querySelector('svg');
        const zoomControls = chart.querySelector('.zoom-controls');
        const zoomInParent = chart.parentElement?.querySelector('.zoom-controls');
        
        // Look in all possible locations
        let zoomFound = null;
        let current = chart;
        while (current && !zoomFound) {
          zoomFound = current.querySelector('.zoom-controls');
          current = current.parentElement;
        }
        
        return {
          index: i,
          hasSvg: !!svg,
          hasZoomControls: !!zoomControls,
          hasZoomInParent: !!zoomInParent,
          zoomFoundAnywhere: !!zoomFound,
          svgClass: svg?.getAttribute('class')
        };
      });
      
      // Also check at document level
      const allZoomControls = document.querySelectorAll('.zoom-controls');
      
      return {
        mode: 'side-by-side',
        chartsCount: charts.length,
        chartsInfo: chartsInfo,
        globalZoomControls: allZoomControls.length
      };
    });
    
    console.log('  Mode:', sideBySideDebug.mode);
    console.log('  Charts count:', sideBySideDebug.chartsCount);
    console.log('  Global zoom controls:', sideBySideDebug.globalZoomControls);
    sideBySideDebug.chartsInfo?.forEach(info => {
      console.log(`  Chart ${info.index}:`, info);
    });
    
    // Try to find zoom controls with more specific selectors
    console.log('\n3. Alternative selectors:');
    const alternativeSearch = await page.evaluate(() => {
      const results = {};
      
      // Search by text content
      const elementsWithZoom = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent.includes('Zoom:') && 
        el.children.length === 0 // Leaf nodes only
      );
      results.elementsWithZoomText = elementsWithZoom.length;
      
      // Search for Reset Zoom button
      const resetButtons = document.querySelectorAll('button:not(.tab-button)');
      const resetZoomButtons = Array.from(resetButtons).filter(btn => 
        btn.textContent.includes('Reset')
      );
      results.resetButtonsCount = resetZoomButtons.length;
      
      // Search by style
      const absolutePositioned = Array.from(document.querySelectorAll('div')).filter(div => {
        const style = window.getComputedStyle(div);
        return style.position === 'absolute' && div.textContent.includes('Zoom');
      });
      results.absoluteWithZoom = absolutePositioned.length;
      
      return results;
    });
    
    console.log('  Elements with "Zoom:" text:', alternativeSearch.elementsWithZoomText);
    console.log('  Reset buttons found:', alternativeSearch.resetButtonsCount);
    console.log('  Absolute positioned with Zoom:', alternativeSearch.absoluteWithZoom);
    
    // Take screenshot for manual inspection
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `~/tmp/tests/playwright_png/zoom-controls-debug-${timestamp}.png`,
      fullPage: true
    });
    
    console.log('\nScreenshot saved for inspection.');
    console.log('Browser will remain open for manual debugging...');
    
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await browser.close();
  }
})();