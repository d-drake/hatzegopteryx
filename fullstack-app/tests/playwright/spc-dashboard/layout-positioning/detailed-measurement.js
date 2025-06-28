const { chromium } = require('playwright');

/**
 * Detailed Layout Measurement Test
 * Measures all elements and gaps in the layout
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Detailed Layout Measurement ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Force zoom to make controls visible
    const charts = await page.$$('.bg-white.rounded-lg.shadow');
    if (charts.length > 0) {
      const firstChart = charts[0];
      const box = await firstChart.boundingBox();
      // Zoom on X-axis
      await page.mouse.move(box.x + box.width / 2, box.y + box.height - 50);
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(1000);
    }
    
    const measurements = await page.evaluate(() => {
      const results = [];
      const containers = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      
      containers.forEach((container, index) => {
        const containerRect = container.getBoundingClientRect();
        
        // Find all key elements
        const elements = {
          title: container.querySelector('h4'),
          titleContainer: container.querySelector('.px-4.pt-4.pb-4'),
          tabContainer: container.querySelector('.px-4.pb-4'),
          tabGroup: container.querySelector('.flex.border-b.border-gray-200'),
          zoomArea: container.querySelector('.px-4.pt-0.pb-2[style*="position: relative"]'),
          chartArea: container.querySelector('.p-4.pt-0'),
          svg: container.querySelector('svg'),
          zoomControls: container.querySelector('[data-testid="zoom-controls"]') || 
                        container.querySelector('[style*="position: absolute"][style*="background: rgba(255,255,255,0.95)"]')
        };
        
        const elementRects = {};
        const relativePositions = {};
        
        // Get rectangles and calculate relative positions
        Object.entries(elements).forEach(([key, element]) => {
          if (element) {
            const rect = element.getBoundingClientRect();
            elementRects[key] = rect;
            relativePositions[key] = {
              top: rect.top - containerRect.top,
              left: rect.left - containerRect.left,
              width: rect.width,
              height: rect.height,
              bottom: rect.bottom - containerRect.top
            };
          }
        });
        
        // Calculate gaps
        const gaps = {};
        
        if (elementRects.tabGroup && elementRects.zoomArea) {
          gaps.tabToZoom = elementRects.zoomArea.top - elementRects.tabGroup.bottom;
        }
        
        if (elementRects.zoomArea && elementRects.svg) {
          gaps.zoomToSvg = elementRects.svg.top - elementRects.zoomArea.bottom;
        }
        
        if (elementRects.titleContainer && elementRects.tabContainer) {
          gaps.titleToTab = elementRects.tabContainer.top - elementRects.titleContainer.bottom;
        }
        
        results.push({
          chartIndex: index,
          elements: relativePositions,
          gaps,
          hasZoomControls: !!elements.zoomControls
        });
      });
      
      return results;
    });
    
    // Display results
    measurements.forEach(m => {
      console.log(`\nChart ${m.chartIndex}:`);
      console.log('Elements found:');
      Object.entries(m.elements).forEach(([key, pos]) => {
        console.log(`  ${key}: top=${pos.top}px, height=${pos.height}px`);
      });
      
      console.log('\nGaps:');
      Object.entries(m.gaps).forEach(([key, gap]) => {
        console.log(`  ${key}: ${gap}px`);
      });
      
      if (m.hasZoomControls) {
        console.log('\n  ✓ Zoom controls are visible');
      }
    });
    
    // Summary
    if (measurements.length > 0) {
      const m = measurements[0];
      console.log('\n=== Summary for Chart 0 ===');
      console.log(`Title to Tab gap: ${m.gaps.titleToTab || 'N/A'}px`);
      console.log(`Tab to Zoom gap: ${m.gaps.tabToZoom || 'N/A'}px`);
      console.log(`Zoom to SVG gap: ${m.gaps.zoomToSvg || 'N/A'}px`);
      console.log(`Zoom controls visible: ${m.hasZoomControls ? 'Yes' : 'No'}`);
    }
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();