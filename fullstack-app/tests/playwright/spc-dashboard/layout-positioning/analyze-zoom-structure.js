const { chromium } = require('playwright');

/**
 * Analyze Zoom Structure
 * Understand how zoom controls are actually positioned
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Analyzing Zoom Control Structure ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Analyze structure before zoom
    console.log('📋 Structure Analysis (No Zoom):\n');
    let structure = await page.evaluate(() => {
      const container = document.querySelector('.bg-white.rounded-lg.shadow');
      if (!container) return null;
      
      // Find the timeline wrapper that contains zoom controls
      const timelineWrapper = container.querySelector('[data-chart-id]');
      const zoomAreaPlaceholder = container.querySelector('.px-4.pt-0.pb-2[style*="position: relative"]');
      const chartContainer = container.querySelector('.p-4.pt-0');
      const svg = container.querySelector('svg');
      
      const result = {
        hasTimelineWrapper: !!timelineWrapper,
        hasZoomAreaPlaceholder: !!zoomAreaPlaceholder,
        hasChartContainer: !!chartContainer,
        hasSvg: !!svg
      };
      
      if (timelineWrapper && svg) {
        const wrapperRect = timelineWrapper.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        result.timelineWrapper = {
          position: timelineWrapper.style.position,
          relativeToContainer: {
            top: wrapperRect.top - containerRect.top,
            left: wrapperRect.left - containerRect.left
          },
          relativeToSvg: {
            top: wrapperRect.top - svgRect.top,
            bottom: wrapperRect.bottom - svgRect.bottom
          }
        };
      }
      
      if (zoomAreaPlaceholder) {
        const rect = zoomAreaPlaceholder.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        result.zoomAreaPlaceholder = {
          height: rect.height,
          relativeTop: rect.top - containerRect.top,
          isEmpty: zoomAreaPlaceholder.children.length === 0
        };
      }
      
      return result;
    });
    
    console.log('Structure found:', JSON.stringify(structure, null, 2));
    
    // Trigger zoom to see where controls appear
    console.log('\n🔍 Triggering zoom to reveal controls...\n');
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
    
    // Analyze with zoom active
    console.log('📋 Structure Analysis (With Zoom):\n');
    structure = await page.evaluate(() => {
      const container = document.querySelector('.bg-white.rounded-lg.shadow');
      if (!container) return null;
      
      const timelineWrapper = container.querySelector('[data-chart-id]');
      const zoomControls = container.querySelector('[style*="position: absolute"][style*="top: -68px"]') ||
                           container.querySelector('[style*="position: absolute"][style*="background: rgba(255,255,255,0.95)"]');
      const svg = container.querySelector('svg');
      
      const result = {
        hasZoomControls: !!zoomControls,
        zoomControlsLocation: null
      };
      
      if (zoomControls) {
        const controlsRect = zoomControls.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        result.zoomControlsLocation = {
          absolutePosition: {
            top: zoomControls.style.top,
            left: zoomControls.style.left,
            position: zoomControls.style.position
          },
          relativeToContainer: {
            top: controlsRect.top - containerRect.top,
            left: controlsRect.left - containerRect.left
          }
        };
        
        // Find parent
        let parent = zoomControls.parentElement;
        let parentInfo = [];
        while (parent && parent !== container) {
          parentInfo.push({
            tagName: parent.tagName,
            className: parent.className,
            hasDataChartId: parent.hasAttribute('data-chart-id'),
            style: {
              position: parent.style.position
            }
          });
          parent = parent.parentElement;
        }
        result.parentHierarchy = parentInfo;
        
        if (svg) {
          const svgRect = svg.getBoundingClientRect();
          result.zoomControlsLocation.relativeToSvg = {
            topDistance: svgRect.top - controlsRect.bottom
          };
        }
      }
      
      return result;
    });
    
    console.log('Zoom controls analysis:', JSON.stringify(structure, null, 2));
    
    console.log('\n🎯 Key Findings:');
    console.log('1. Zoom controls are rendered inside the Timeline component wrapper');
    console.log('2. They use absolute positioning with top: -68px');
    console.log('3. The empty zoom area div in SPCChartWrapper is not being used');
    console.log('4. To move zoom controls, we need to either:');
    console.log('   - Change the Timeline component structure');
    console.log('   - Adjust the absolute positioning value');
    console.log('   - Move the Timeline wrapper div itself');
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();