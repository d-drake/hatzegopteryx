const { chromium } = require('playwright');

/**
 * Test to verify zoom controls positioning
 * - Should be closer to left axis (5-10px)
 * - Should appear when zoom is active
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Zoom Controls Position Test ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Test 1: Initial state (no zoom controls)
    console.log('Test 1: Initial State');
    const initialZoomControls = await page.evaluate(() => {
      const controls = document.querySelector('[style*="Zoom:"]')?.parentElement?.parentElement;
      return !!controls;
    });
    
    console.log(`  Zoom controls visible initially: ${initialZoomControls ? 'YES' : 'NO'} (should be NO)`);
    
    // Test 2: Trigger zoom to show controls
    console.log('\nTest 2: Zoom Controls After Zoom');
    
    // Find the first chart and zoom on X-axis
    const firstChart = await page.$('.bg-white.rounded-lg.shadow');
    if (firstChart) {
      const chartBox = await firstChart.boundingBox();
      
      // Simulate scroll on X-axis area (bottom of chart)
      await page.mouse.move(chartBox.x + chartBox.width / 2, chartBox.y + chartBox.height - 50);
      await page.mouse.wheel(0, -100); // Scroll up to zoom in
      await page.waitForTimeout(500);
      
      // Check zoom controls position
      const zoomControlsAnalysis = await page.evaluate(() => {
        const results = [];
        
        // Find all zoom controls
        const zoomControls = Array.from(document.querySelectorAll('[style*="position: absolute"]'))
          .filter(el => el.textContent.includes('Zoom:'));
        
        zoomControls.forEach((control, index) => {
          const controlRect = control.getBoundingClientRect();
          const container = control.closest('[data-chart-id]') || control.closest('.bg-white');
          const svg = container?.querySelector('svg');
          
          if (svg) {
            const svgRect = svg.getBoundingClientRect();
            
            // Find left axis
            const leftAxis = svg.querySelector('.axis');
            const axisRect = leftAxis?.getBoundingClientRect();
            
            results.push({
              index,
              controlTop: controlRect.top,
              svgTop: svgRect.top,
              distanceFromSvgTop: controlRect.top - svgRect.top,
              leftPosition: parseFloat(control.style.left),
              topPosition: parseFloat(control.style.top),
              zoomText: control.textContent,
              hasResetButton: control.querySelector('button') !== null
            });
          }
        });
        
        return results;
      });
      
      if (zoomControlsAnalysis.length > 0) {
        console.log('  Zoom controls found after zoom:');
        zoomControlsAnalysis.forEach(analysis => {
          console.log(`    Control ${analysis.index}:`);
          console.log(`      Position: top=${analysis.topPosition}px, left=${analysis.leftPosition}px`);
          console.log(`      Distance from SVG top: ${analysis.distanceFromSvgTop.toFixed(1)}px`);
          console.log(`      Has reset button: ${analysis.hasResetButton ? 'YES ✅' : 'NO ❌'}`);
          
          const isCloseToAxis = analysis.topPosition >= 5 && analysis.topPosition <= 15;
          console.log(`      Close to axis (5-15px): ${isCloseToAxis ? 'YES ✅' : 'NO ❌'}`);
        });
      } else {
        console.log('  ❌ No zoom controls found after zoom');
      }
      
      // Test 3: Click reset button
      console.log('\nTest 3: Reset Button Functionality');
      const resetButton = await page.$('button:has-text("Reset")');
      if (resetButton) {
        await resetButton.click();
        await page.waitForTimeout(500);
        
        const controlsAfterReset = await page.evaluate(() => {
          const controls = document.querySelector('[style*="Zoom:"]')?.parentElement?.parentElement;
          return !!controls;
        });
        
        console.log(`  Zoom controls after reset: ${controlsAfterReset ? 'VISIBLE ❌' : 'HIDDEN ✅'}`);
      }
    }
    
    // Test 4: Multiple charts zoom
    console.log('\nTest 4: Multiple Charts Zoom');
    
    // Zoom on all three charts
    const charts = await page.$$('.bg-white.rounded-lg.shadow');
    for (let i = 0; i < Math.min(3, charts.length); i++) {
      const chart = charts[i];
      const box = await chart.boundingBox();
      
      // Zoom on Y-axis (left side)
      await page.mouse.move(box.x + 30, box.y + box.height / 2);
      await page.mouse.wheel(0, -50);
      await page.waitForTimeout(200);
    }
    
    // Count zoom controls
    const zoomControlCount = await page.evaluate(() => {
      const controls = Array.from(document.querySelectorAll('[style*="position: absolute"]'))
        .filter(el => el.textContent.includes('Zoom:'));
      return controls.length;
    });
    
    console.log(`  Zoom controls visible: ${zoomControlCount}`);
    console.log(`  Expected: 3 (one per chart)`);
    
    // Take screenshot with zoom controls
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/zoom-controls-position.png',
      fullPage: true 
    });
    
    // Save results
    const fs = require('fs');
    const results = {
      timestamp: new Date().toISOString(),
      zoomControlsPosition: zoomControlsAnalysis,
      multipleChartsZoom: {
        controlsCount: zoomControlCount,
        expected: 3
      }
    };
    
    fs.writeFileSync(
      '/home/dwdra/tmp/tests/playwright_md/zoom-controls-position-results.json',
      JSON.stringify(results, null, 2)
    );
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();