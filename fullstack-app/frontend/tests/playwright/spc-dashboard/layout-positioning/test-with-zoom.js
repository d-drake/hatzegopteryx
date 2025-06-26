const { chromium } = require('playwright');

/**
 * Test Layout with Zoom Controls Visible
 * Verifies positioning when zoom controls are displayed
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Testing Layout with Zoom Controls ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Trigger zoom to make controls visible
    console.log('Triggering zoom on first chart...');
    const charts = await page.$$('.bg-white.rounded-lg.shadow');
    if (charts.length > 0) {
      const firstChart = charts[0];
      const box = await firstChart.boundingBox();
      
      // Zoom on X-axis
      await page.mouse.move(box.x + box.width / 2, box.y + box.height - 50);
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, -50);
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(500);
    }
    
    // Now measure with zoom controls visible
    const measurements = await page.evaluate(() => {
      const container = document.querySelector('.bg-white.rounded-lg.shadow');
      if (!container) return null;
      
      const containerRect = container.getBoundingClientRect();
      
      // Find elements
      const title = container.querySelector('h4');
      const tabGroup = container.querySelector('.flex.border-b.border-gray-200');
      const zoomArea = container.querySelector('.px-4.pt-0.pb-2[style*="position: relative"]');
      const svg = container.querySelector('svg');
      const zoomControls = container.querySelector('[style*="position: absolute"][style*="top: -68px"]') ||
                           container.querySelector('[style*="position: absolute"][style*="background: rgba(255,255,255,0.95)"]');
      
      const result = {
        hasZoomControls: !!zoomControls,
        elements: {}
      };
      
      // Get positions
      if (title) {
        const rect = title.getBoundingClientRect();
        result.elements.title = {
          top: rect.top - containerRect.top,
          height: rect.height
        };
      }
      
      if (tabGroup) {
        const rect = tabGroup.getBoundingClientRect();
        result.elements.tabGroup = {
          top: rect.top - containerRect.top,
          bottom: rect.bottom - containerRect.top,
          left: rect.left - containerRect.left,
          height: rect.height
        };
      }
      
      if (zoomArea) {
        const rect = zoomArea.getBoundingClientRect();
        result.elements.zoomArea = {
          top: rect.top - containerRect.top,
          bottom: rect.bottom - containerRect.top,
          left: rect.left - containerRect.left,
          height: rect.height
        };
      }
      
      if (svg) {
        const rect = svg.getBoundingClientRect();
        result.elements.svg = {
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
          height: rect.height
        };
      }
      
      if (zoomControls) {
        const rect = zoomControls.getBoundingClientRect();
        result.elements.zoomControls = {
          top: rect.top - containerRect.top,
          bottom: rect.bottom - containerRect.top,
          left: rect.left - containerRect.left,
          height: rect.height,
          // Check position relative to other elements
          relativeToSvg: svg ? rect.bottom - svg.getBoundingClientRect().top : null,
          relativeToZoomArea: zoomArea ? rect.top - zoomArea.getBoundingClientRect().top : null
        };
      }
      
      // Calculate gaps
      result.gaps = {};
      if (tabGroup && zoomArea) {
        result.gaps.tabToZoomArea = result.elements.zoomArea.top - result.elements.tabGroup.bottom;
      }
      
      if (zoomArea && svg) {
        result.gaps.zoomAreaToSvg = result.elements.svg.top - result.elements.zoomArea.bottom;
      }
      
      if (zoomControls && svg) {
        result.gaps.zoomControlsToSvg = result.elements.svg.top - result.elements.zoomControls.bottom;
      }
      
      // Check alignment
      if (tabGroup && zoomArea) {
        result.alignment = {
          tabGroupLeft: result.elements.tabGroup.left,
          zoomAreaLeft: result.elements.zoomArea.left,
          isAligned: Math.abs(result.elements.tabGroup.left - result.elements.zoomArea.left) < 1
        };
      }
      
      return result;
    });
    
    if (!measurements) {
      console.log('Could not find chart container');
      return;
    }
    
    // Display results
    console.log('📊 Layout Measurements with Zoom Active:\n');
    
    console.log(`Zoom controls visible: ${measurements.hasZoomControls ? '✅' : '❌'}`);
    
    if (measurements.elements.title) {
      console.log(`\nTitle position: top=${measurements.elements.title.top}px`);
    }
    
    if (measurements.elements.tabGroup) {
      console.log(`Tab Group: top=${measurements.elements.tabGroup.top}px, bottom=${measurements.elements.tabGroup.bottom}px`);
    }
    
    if (measurements.elements.zoomArea) {
      console.log(`Zoom Area: top=${measurements.elements.zoomArea.top}px, bottom=${measurements.elements.zoomArea.bottom}px`);
    }
    
    if (measurements.elements.svg) {
      console.log(`Chart SVG: top=${measurements.elements.svg.top}px`);
    }
    
    if (measurements.elements.zoomControls) {
      console.log(`\nZoom Controls:`);
      console.log(`  Position: top=${measurements.elements.zoomControls.top}px, bottom=${measurements.elements.zoomControls.bottom}px`);
      console.log(`  Distance from SVG top: ${measurements.elements.zoomControls.relativeToSvg}px`);
      console.log(`  Within zoom area: ${measurements.elements.zoomControls.relativeToZoomArea}px from top`);
    }
    
    console.log('\n📏 Gaps:');
    Object.entries(measurements.gaps).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}px`);
    });
    
    if (measurements.alignment) {
      console.log(`\n📐 Alignment:`);
      console.log(`  Tab Group left: ${measurements.alignment.tabGroupLeft}px`);
      console.log(`  Zoom Area left: ${measurements.alignment.zoomAreaLeft}px`);
      console.log(`  Aligned: ${measurements.alignment.isAligned ? '✅' : '❌'}`);
    }
    
    // Take screenshot with zoom controls visible
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/layout-with-zoom-controls.png',
      fullPage: false 
    });
    
    console.log('\nScreenshot saved: layout-with-zoom-controls.png');
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();