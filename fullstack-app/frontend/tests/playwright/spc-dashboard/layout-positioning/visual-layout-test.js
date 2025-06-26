const { chromium } = require('playwright');

/**
 * Visual Layout Test
 * Takes screenshots and overlays measurements for layout positioning
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Visual Layout Test ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Add visual guides to show current positioning
    await page.evaluate(() => {
      const containers = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      
      containers.forEach((container, index) => {
        // Only process first chart for clarity
        if (index > 0) return;
        
        const title = container.querySelector('h4');
        const tabGroup = container.querySelector('.flex.border-b.border-gray-200');
        const zoomArea = container.querySelector('.px-4.pt-2.pb-4[style*="position: relative"]');
        const svg = container.querySelector('svg');
        
        // Add colored borders to visualize elements
        if (title) {
          title.style.border = '2px solid red';
          title.style.borderRadius = '4px';
        }
        
        if (tabGroup) {
          tabGroup.style.border = '2px solid blue';
          tabGroup.style.borderRadius = '4px';
        }
        
        if (zoomArea) {
          zoomArea.style.border = '2px solid green';
          zoomArea.style.borderRadius = '4px';
          zoomArea.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
        }
        
        if (svg) {
          svg.style.border = '2px solid purple';
        }
        
        // Add labels
        const addLabel = (element, text, color) => {
          if (!element) return;
          const label = document.createElement('div');
          label.textContent = text;
          label.style.cssText = `
            position: absolute;
            background: ${color};
            color: white;
            padding: 2px 8px;
            font-size: 12px;
            font-weight: bold;
            border-radius: 4px;
            z-index: 1000;
            pointer-events: none;
          `;
          element.style.position = 'relative';
          element.appendChild(label);
        };
        
        addLabel(title?.parentElement, 'TITLE', 'red');
        addLabel(tabGroup?.parentElement, 'TAB GROUP', 'blue');
        addLabel(zoomArea, 'ZOOM AREA', 'green');
        addLabel(svg?.parentElement, 'CHART SVG', 'purple');
        
        // Add gap measurements
        if (tabGroup && zoomArea) {
          const tabRect = tabGroup.getBoundingClientRect();
          const zoomRect = zoomArea.getBoundingClientRect();
          const gap = zoomRect.top - tabRect.bottom;
          
          const gapIndicator = document.createElement('div');
          gapIndicator.textContent = `${gap}px`;
          gapIndicator.style.cssText = `
            position: absolute;
            left: 50%;
            top: ${tabRect.bottom - container.getBoundingClientRect().top}px;
            height: ${gap}px;
            border-left: 2px dashed orange;
            padding-left: 10px;
            color: orange;
            font-weight: bold;
            font-size: 14px;
            display: flex;
            align-items: center;
          `;
          container.appendChild(gapIndicator);
        }
        
        if (zoomArea && svg) {
          const zoomRect = zoomArea.getBoundingClientRect();
          const svgRect = svg.getBoundingClientRect();
          const gap = svgRect.top - zoomRect.bottom;
          
          const gapIndicator = document.createElement('div');
          gapIndicator.textContent = `Current: ${gap}px → Target: 8px`;
          gapIndicator.style.cssText = `
            position: absolute;
            left: 60%;
            top: ${zoomRect.bottom - container.getBoundingClientRect().top}px;
            height: ${gap}px;
            border-left: 2px dashed red;
            padding-left: 10px;
            color: red;
            font-weight: bold;
            font-size: 14px;
            display: flex;
            align-items: center;
            background: rgba(255,255,255,0.9);
            padding: 2px 10px;
            border-radius: 4px;
          `;
          container.appendChild(gapIndicator);
        }
      });
    });
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/layout-current-state.png',
      fullPage: false 
    });
    
    console.log('Screenshot saved: layout-current-state.png');
    console.log('\nCurrent Layout Structure:');
    console.log('- Title (red border)');
    console.log('- Tab Group (blue border)');
    console.log('- Zoom Area (green border) - 8px gap from Tab Group');
    console.log('- Chart SVG (purple border) - needs to be 8px from Zoom Area');
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();