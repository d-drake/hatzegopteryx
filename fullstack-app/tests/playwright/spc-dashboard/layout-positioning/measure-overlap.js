const { chromium } = require('playwright');

/**
 * Measure Current Overlap
 * Understand the positioning of Tab Group vs Zoom Controls
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Measuring Tab Group and Zoom Controls Overlap ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Get tab group position
    const tabGroupMeasurements = await page.evaluate(() => {
      const container = document.querySelector('.bg-white.rounded-lg.shadow');
      const tabGroup = container?.querySelector('.flex.border-b.border-gray-200');
      const svg = container?.querySelector('svg');
      
      if (!container || !tabGroup || !svg) return null;
      
      const containerRect = container.getBoundingClientRect();
      const tabRect = tabGroup.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      
      return {
        tabGroup: {
          top: tabRect.top - containerRect.top,
          bottom: tabRect.bottom - containerRect.top,
          height: tabRect.height
        },
        svg: {
          top: svgRect.top - containerRect.top
        }
      };
    });
    
    console.log('Tab Group position:', tabGroupMeasurements);
    
    // Trigger zoom
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
    
    // Measure with zoom controls
    const withZoomMeasurements = await page.evaluate(() => {
      const container = document.querySelector('.bg-white.rounded-lg.shadow');
      const tabGroup = container?.querySelector('.flex.border-b.border-gray-200');
      const zoomControls = container?.querySelector('[style*="position: absolute"]');
      const svg = container?.querySelector('svg');
      
      if (!container || !tabGroup || !svg) return null;
      
      const containerRect = container.getBoundingClientRect();
      const tabRect = tabGroup.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      
      const result = {
        tabGroup: {
          top: tabRect.top - containerRect.top,
          bottom: tabRect.bottom - containerRect.top
        },
        svg: {
          top: svgRect.top - containerRect.top
        },
        hasZoomControls: !!zoomControls
      };
      
      if (zoomControls) {
        const zoomRect = zoomControls.getBoundingClientRect();
        result.zoomControls = {
          top: zoomRect.top - containerRect.top,
          bottom: zoomRect.bottom - containerRect.top,
          height: zoomRect.height
        };
        
        // Calculate overlaps and gaps
        result.analysis = {
          tabToZoomGap: result.zoomControls.top - result.tabGroup.bottom,
          zoomToSvgGap: result.svg.top - result.zoomControls.bottom,
          isOverlapping: result.zoomControls.top < result.tabGroup.bottom
        };
      }
      
      return result;
    });
    
    console.log('\n📊 Measurements with Zoom Controls:');
    if (withZoomMeasurements?.hasZoomControls) {
      console.log('Tab Group: top=' + withZoomMeasurements.tabGroup.top + 'px, bottom=' + withZoomMeasurements.tabGroup.bottom + 'px');
      console.log('Zoom Controls: top=' + withZoomMeasurements.zoomControls.top + 'px, bottom=' + withZoomMeasurements.zoomControls.bottom + 'px');
      console.log('SVG: top=' + withZoomMeasurements.svg.top + 'px');
      
      console.log('\n📏 Current Gaps:');
      console.log('Tab Group → Zoom Controls: ' + withZoomMeasurements.analysis.tabToZoomGap + 'px (target: 8px)');
      console.log('Zoom Controls → SVG: ' + withZoomMeasurements.analysis.zoomToSvgGap + 'px (target: 8px)');
      console.log('Overlapping: ' + (withZoomMeasurements.analysis.isOverlapping ? '❌ Yes' : '✅ No'));
      
      // Calculate needed adjustment
      const currentZoomTop = withZoomMeasurements.zoomControls.top;
      const targetZoomTop = withZoomMeasurements.tabGroup.bottom + 8;
      const adjustment = targetZoomTop - currentZoomTop;
      
      console.log('\n🔧 Needed Adjustment:');
      console.log('Current zoom top: ' + currentZoomTop + 'px');
      console.log('Target zoom top: ' + targetZoomTop + 'px');
      console.log('Need to move down by: ' + adjustment + 'px');
      
      // Current absolute positioning is top: -59px
      const newTopValue = -59 + adjustment;
      console.log('New top value for ZoomControls: ' + newTopValue + 'px');
    }
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();