const { chromium } = require('playwright');

/**
 * Verify Zoom Controls Positioning
 * Ensures zoom controls appear with bottom edge 8px above chart
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Verifying Zoom Controls Positioning ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Get initial measurements
    const beforeZoom = await page.evaluate(() => {
      const container = document.querySelector('.bg-white.rounded-lg.shadow');
      const svg = container?.querySelector('svg');
      const tabGroup = container?.querySelector('.flex.border-b.border-gray-200');
      
      if (!container || !svg || !tabGroup) return null;
      
      const svgRect = svg.getBoundingClientRect();
      const tabRect = tabGroup.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      return {
        svg: {
          top: svgRect.top - containerRect.top,
          left: svgRect.left - containerRect.left
        },
        tabGroup: {
          left: tabRect.left - containerRect.left
        }
      };
    });
    
    console.log('Initial measurements:', beforeZoom);
    
    // Force zoom by injecting mouse wheel event
    await page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const event = new WheelEvent('wheel', {
          deltaY: -100,
          clientX: rect.left + rect.width / 2,
          clientY: rect.bottom - 50,
          bubbles: true
        });
        svg.dispatchEvent(event);
      }
    });
    
    await page.waitForTimeout(500);
    
    // Check if zoom controls appeared and measure position
    const withZoom = await page.evaluate(() => {
      const container = document.querySelector('.bg-white.rounded-lg.shadow');
      const svg = container?.querySelector('svg');
      const zoomControls = container?.querySelector('[style*="position: absolute"]');
      
      if (!container || !svg) return null;
      
      const result = {
        hasZoomControls: !!zoomControls,
        measurements: {}
      };
      
      if (zoomControls) {
        const zoomRect = zoomControls.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        result.measurements = {
          zoomControls: {
            top: zoomRect.top - containerRect.top,
            bottom: zoomRect.bottom - containerRect.top,
            left: zoomRect.left - containerRect.left,
            height: zoomRect.height,
            style: {
              top: zoomControls.style.top,
              left: zoomControls.style.left
            }
          },
          svg: {
            top: svgRect.top - containerRect.top
          },
          gap: svgRect.top - zoomRect.bottom
        };
      }
      
      return result;
    });
    
    console.log('\n📊 Results after triggering zoom:');
    console.log(`Zoom controls visible: ${withZoom?.hasZoomControls ? '✅' : '❌'}`);
    
    if (withZoom?.hasZoomControls && withZoom.measurements) {
      const m = withZoom.measurements;
      console.log('\nZoom Controls Position:');
      console.log(`  Top: ${m.zoomControls.top}px`);
      console.log(`  Left: ${m.zoomControls.left}px`);
      console.log(`  Height: ${m.zoomControls.height}px`);
      console.log(`  Style: top=${m.zoomControls.style.top}, left=${m.zoomControls.style.left}`);
      
      console.log('\nSVG Position:');
      console.log(`  Top: ${m.svg.top}px`);
      
      console.log('\n📏 Key Measurement:');
      console.log(`  Gap between zoom controls bottom and SVG top: ${m.gap}px`);
      
      const gapOk = Math.abs(m.gap - 8) < 2;
      console.log(`  Target gap (8px): ${gapOk ? '✅ Achieved' : '❌ Not achieved'}`);
      
      const alignmentOk = m.zoomControls.left === beforeZoom.tabGroup.left;
      console.log(`  Left alignment with tab group: ${alignmentOk ? '✅' : '❌'} (zoom: ${m.zoomControls.left}px, tabs: ${beforeZoom.tabGroup.left}px)`);
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/zoom-controls-positioned.png',
      fullPage: false 
    });
    
    console.log('\nScreenshot saved: zoom-controls-positioned.png');
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();