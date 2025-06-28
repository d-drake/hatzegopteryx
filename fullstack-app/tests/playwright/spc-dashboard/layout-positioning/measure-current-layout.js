const { chromium } = require('playwright');

/**
 * Measure Current Layout Test
 * Records current positions and gaps between Tab Group and Zoom Container
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Current Layout Measurement Test ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Get all chart containers
    const measurements = await page.evaluate(() => {
      const results = [];
      const containers = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      
      containers.forEach((container, index) => {
        // Find key elements
        const title = container.querySelector('h4');
        const tabGroup = container.querySelector('.flex.border-b.border-gray-200');
        const zoomArea = container.querySelector('.px-4.pt-2.pb-4[style*="position: relative"]');
        const chartArea = container.querySelector('.p-4.pt-0');
        const svg = container.querySelector('svg');
        
        // Get bounding rectangles
        const containerRect = container.getBoundingClientRect();
        const titleRect = title?.getBoundingClientRect();
        const tabRect = tabGroup?.getBoundingClientRect();
        const zoomAreaRect = zoomArea?.getBoundingClientRect();
        const chartAreaRect = chartArea?.getBoundingClientRect();
        const svgRect = svg?.getBoundingClientRect();
        
        // Calculate gaps and positions
        const result = {
          chartIndex: index,
          container: {
            width: containerRect.width,
            height: containerRect.height
          },
          title: titleRect ? {
            top: titleRect.top - containerRect.top,
            left: titleRect.left - containerRect.left,
            width: titleRect.width,
            height: titleRect.height
          } : null,
          tabGroup: tabRect ? {
            top: tabRect.top - containerRect.top,
            left: tabRect.left - containerRect.left,
            width: tabRect.width,
            height: tabRect.height
          } : null,
          zoomArea: zoomAreaRect ? {
            top: zoomAreaRect.top - containerRect.top,
            left: zoomAreaRect.left - containerRect.left,
            width: zoomAreaRect.width,
            height: zoomAreaRect.height
          } : null,
          chartArea: chartAreaRect ? {
            top: chartAreaRect.top - containerRect.top,
            left: chartAreaRect.left - containerRect.left,
            width: chartAreaRect.width,
            height: chartAreaRect.height
          } : null,
          svg: svgRect ? {
            top: svgRect.top - containerRect.top,
            left: svgRect.left - containerRect.left,
            width: svgRect.width,
            height: svgRect.height
          } : null
        };
        
        // Calculate key gaps
        if (tabRect && zoomAreaRect) {
          result.verticalGapTabToZoomArea = zoomAreaRect.top - tabRect.bottom;
        }
        
        if (zoomAreaRect && svgRect) {
          result.verticalGapZoomAreaToSvg = svgRect.top - zoomAreaRect.bottom;
        }
        
        // Find actual zoom controls if visible
        const zoomControls = container.querySelector('[style*="position: absolute"][style*="top: -60px"]');
        if (zoomControls) {
          const zoomRect = zoomControls.getBoundingClientRect();
          result.actualZoomControls = {
            top: zoomRect.top - containerRect.top,
            left: zoomRect.left - containerRect.left,
            width: zoomRect.width,
            height: zoomRect.height,
            // Position relative to chart area
            relativeToChartArea: chartAreaRect ? {
              top: zoomRect.top - chartAreaRect.top,
              left: zoomRect.left - chartAreaRect.left
            } : null
          };
        }
        
        results.push(result);
      });
      
      return results;
    });
    
    // Display measurements
    console.log('Current Layout Measurements:\n');
    
    measurements.forEach(m => {
      console.log(`Chart ${m.chartIndex}:`);
      console.log(`  Container: ${m.container.width}x${m.container.height}`);
      
      if (m.title) {
        console.log(`  Title: top=${m.title.top}px, height=${m.title.height}px`);
      }
      
      if (m.tabGroup) {
        console.log(`  Tab Group: top=${m.tabGroup.top}px, height=${m.tabGroup.height}px`);
      }
      
      if (m.zoomArea) {
        console.log(`  Zoom Area: top=${m.zoomArea.top}px, height=${m.zoomArea.height}px`);
      }
      
      if (m.verticalGapTabToZoomArea !== undefined) {
        console.log(`  ✓ Vertical Gap (Tab → Zoom Area): ${m.verticalGapTabToZoomArea}px`);
      }
      
      if (m.chartArea) {
        console.log(`  Chart Area: top=${m.chartArea.top}px`);
      }
      
      if (m.svg) {
        console.log(`  SVG: top=${m.svg.top}px`);
      }
      
      if (m.actualZoomControls) {
        console.log(`  Actual Zoom Controls (when visible):`);
        console.log(`    Position: top=${m.actualZoomControls.top}px, left=${m.actualZoomControls.left}px`);
        console.log(`    Relative to Chart Area: top=${m.actualZoomControls.relativeToChartArea.top}px, left=${m.actualZoomControls.relativeToChartArea.left}px`);
      }
      
      console.log('');
    });
    
    // Key findings summary
    if (measurements.length > 0 && measurements[0].verticalGapTabToZoomArea !== undefined) {
      console.log('=== Key Measurements ===');
      console.log(`Vertical Gap between Tab Group and Zoom Area: ${measurements[0].verticalGapTabToZoomArea}px`);
      console.log('\nThis is the gap that needs to be maintained after repositioning.');
    }
    
    // Save measurements for reference
    const fs = require('fs');
    fs.writeFileSync(
      '/home/dwdra/tmp/tests/playwright_md/current-layout-measurements.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        measurements,
        keyGap: measurements[0]?.verticalGapTabToZoomArea || 0
      }, null, 2)
    );
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();