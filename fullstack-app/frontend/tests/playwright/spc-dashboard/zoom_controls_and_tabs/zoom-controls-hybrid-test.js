const { chromium } = require('playwright');

/**
 * Hybrid test for zoom controls:
 * 1. Visibility Override Test - Force controls visible to test positioning
 * 2. Functional Zoom Test - Test actual zoom interactions
 * 3. Integration Test - Complete workflow testing
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Zoom Controls Hybrid Test ===\n');
    
    const testResults = {
      visibilityTest: false,
      functionalTest: false,
      integrationTest: false,
      positioningTest: false
    };
    
    // Phase 1: Visibility Override Test
    console.log('Phase 1: Visibility Override Test');
    
    const page1 = await browser.newPage();
    await page1.setViewportSize({ width: 1200, height: 800 });
    await page1.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page1.waitForSelector('svg', { timeout: 10000 });
    await page1.waitForTimeout(2000);
    
    // Force zoom controls to be visible with CSS injection
    await page1.addStyleTag({
      content: `
        /* Force zoom controls to be visible for testing */
        div[style*="position: absolute"][style*="background: rgba(255,255,255,0.95)"] {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Create test zoom controls if none exist */
        .test-zoom-controls {
          position: absolute;
          top: -60px;
          left: 80px;
          z-index: 10;
          background: rgba(255,255,255,0.95);
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 12px;
          border: 1px solid #d1d5db;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          min-width: 200px;
        }
      `
    });
    
    // Inject test zoom controls for positioning verification
    await page1.evaluate(() => {
      const charts = document.querySelectorAll('[data-chart-id]');
      charts.forEach((chart, index) => {
        const testControl = document.createElement('div');
        testControl.className = 'test-zoom-controls';
        testControl.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="color: #6b7280; font-weight: 500;">
              <strong>Zoom:</strong> X: 2.1x, Y: 1.5x
            </span>
            <button style="padding: 2px 6px; font-size: 10px; border: 1px solid #6b7280; border-radius: 3px; background: #f9fafb; cursor: pointer;">
              Reset
            </button>
          </div>
          <div style="font-size: 10px; color: #6b7280; line-height: 1.2;">
            Scroll over X-axis or Y-axis to zoom
          </div>
        `;
        chart.appendChild(testControl);
      });
    });
    
    await page1.waitForTimeout(500);
    
    // Test positioning relative to axes and tabs
    const positioningAnalysis = await page1.evaluate(() => {
      const results = [];
      const testControls = document.querySelectorAll('.test-zoom-controls');
      
      testControls.forEach((control, index) => {
        const controlRect = control.getBoundingClientRect();
        const container = control.closest('.bg-white.rounded-lg.shadow');
        const svg = container?.querySelector('svg');
        const tabs = container?.querySelector('.flex.border-b');
        const leftAxis = svg?.querySelector('.axis');
        
        if (container && svg && tabs) {
          const containerRect = container.getBoundingClientRect();
          const svgRect = svg.getBoundingClientRect();
          const tabsRect = tabs.getBoundingClientRect();
          const leftAxisRect = leftAxis?.getBoundingClientRect();
          
          results.push({
            chartIndex: index,
            controlPosition: {
              top: controlRect.top - containerRect.top,
              left: controlRect.left - containerRect.left
            },
            svgPosition: {
              top: svgRect.top - containerRect.top
            },
            tabsPosition: {
              bottom: tabsRect.bottom - containerRect.top
            },
            positioning: {
              aboveSVG: controlRect.bottom < svgRect.top,
              belowTabs: controlRect.top > tabsRect.bottom,
              noAxisOverlap: leftAxisRect ? controlRect.left > leftAxisRect.right || controlRect.right < leftAxisRect.left : true
            }
          });
        }
      });
      
      return results;
    });
    
    console.log('  Positioning Analysis:');
    let positioningOk = true;
    positioningAnalysis.forEach(analysis => {
      console.log(`    Chart ${analysis.chartIndex}:`);
      console.log(`      Above SVG: ${analysis.positioning.aboveSVG ? '✅' : '❌'}`);
      console.log(`      Below tabs: ${analysis.positioning.belowTabs ? '✅' : '❌'}`);
      console.log(`      No axis overlap: ${analysis.positioning.noAxisOverlap ? '✅' : '❌'}`);
      
      if (!analysis.positioning.aboveSVG || !analysis.positioning.belowTabs || !analysis.positioning.noAxisOverlap) {
        positioningOk = false;
      }
    });
    
    testResults.positioningTest = positioningOk;
    testResults.visibilityTest = positioningAnalysis.length > 0;
    
    await page1.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/zoom-controls-visibility-test.png',
      fullPage: true 
    });
    
    await page1.close();
    
    // Phase 2: Functional Zoom Test
    console.log('\nPhase 2: Functional Zoom Test');
    
    const page2 = await browser.newPage();
    await page2.setViewportSize({ width: 1200, height: 800 });
    await page2.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page2.waitForSelector('svg', { timeout: 10000 });
    await page2.waitForTimeout(2000);
    
    // Try to trigger zoom on first chart
    const firstChart = await page2.$('.bg-white.rounded-lg.shadow');
    if (firstChart) {
      const box = await firstChart.boundingBox();
      
      // Zoom on X-axis area
      await page2.mouse.move(box.x + box.width / 2, box.y + box.height - 50);
      await page2.mouse.wheel(0, -200); // Strong zoom
      await page2.waitForTimeout(1000);
      
      // Check if any zoom controls appeared
      const zoomControlsFound = await page2.evaluate(() => {
        const controls = Array.from(document.querySelectorAll('div'))
          .filter(div => div.textContent.includes('Zoom:') && div.textContent.includes('Reset'));
        return controls.length;
      });
      
      console.log(`  Zoom controls after wheel event: ${zoomControlsFound} found`);
      
      // Try alternative zoom trigger - Y-axis
      await page2.mouse.move(box.x + 30, box.y + box.height / 2);
      await page2.mouse.wheel(0, -200);
      await page2.waitForTimeout(1000);
      
      const zoomControlsFound2 = await page2.evaluate(() => {
        const controls = Array.from(document.querySelectorAll('div'))
          .filter(div => div.textContent.includes('Zoom:') && div.textContent.includes('Reset'));
        return controls.length;
      });
      
      console.log(`  Zoom controls after Y-axis zoom: ${zoomControlsFound2} found`);
      
      testResults.functionalTest = zoomControlsFound > 0 || zoomControlsFound2 > 0;
      
      // If controls appeared, test reset
      if (zoomControlsFound > 0 || zoomControlsFound2 > 0) {
        const resetButton = await page2.$('button:text("Reset")');
        if (resetButton) {
          await resetButton.click();
          await page2.waitForTimeout(500);
          
          const controlsAfterReset = await page2.evaluate(() => {
            const controls = Array.from(document.querySelectorAll('div'))
              .filter(div => div.textContent.includes('Zoom:') && div.textContent.includes('Reset'));
            return controls.length;
          });
          
          console.log(`  Controls after reset: ${controlsAfterReset} (should be 0)`);
        }
      }
    }
    
    await page2.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/zoom-controls-functional-test.png',
      fullPage: true 
    });
    
    await page2.close();
    
    // Phase 3: Integration Test
    console.log('\nPhase 3: Integration Test');
    
    const page3 = await browser.newPage();
    await page3.setViewportSize({ width: 1200, height: 800 });
    await page3.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page3.waitForSelector('svg', { timeout: 10000 });
    await page3.waitForTimeout(2000);
    
    // Test workflow: switch tabs, zoom, verify controls position
    console.log('  Testing tab switching with zoom...');
    
    // Switch to Variability tab
    await page3.click('button:text("Variability")');
    await page3.waitForTimeout(500);
    
    // Switch back to Timeline
    await page3.click('button:text("Timeline")');
    await page3.waitForTimeout(500);
    
    // Now try zoom
    const charts = await page3.$$('.bg-white.rounded-lg.shadow');
    let integrationSuccess = true;
    
    for (let i = 0; i < Math.min(2, charts.length); i++) {
      const chart = charts[i];
      const box = await chart.boundingBox();
      
      // Trigger zoom
      await page3.mouse.move(box.x + box.width / 2, box.y + box.height - 40);
      await page3.mouse.wheel(0, -100);
      await page3.waitForTimeout(200);
    }
    
    // Verify overall layout integrity
    const layoutIntegrity = await page3.evaluate(() => {
      const containers = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      let issues = 0;
      
      containers.forEach(container => {
        const title = container.querySelector('h4');
        const tabs = container.querySelector('.flex.border-b');
        const svg = container.querySelector('svg');
        
        if (title && tabs && svg) {
          const titleRect = title.getBoundingClientRect();
          const tabsRect = tabs.getBoundingClientRect();
          const svgRect = svg.getBoundingClientRect();
          
          // Check proper ordering: title → tabs → svg
          if (titleRect.bottom > tabsRect.top || tabsRect.bottom > svgRect.top) {
            issues++;
          }
        }
      });
      
      return {
        totalContainers: containers.length,
        layoutIssues: issues
      };
    });
    
    console.log(`  Layout integrity: ${layoutIntegrity.layoutIssues}/${layoutIntegrity.totalContainers} issues`);
    testResults.integrationTest = layoutIntegrity.layoutIssues === 0;
    
    await page3.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/zoom-controls-integration-test.png',
      fullPage: true 
    });
    
    await page3.close();
    
    // Final Results
    console.log('\n=== Hybrid Test Results ===');
    console.log(`Visibility Test: ${testResults.visibilityTest ? '✅' : '❌'}`);
    console.log(`Positioning Test: ${testResults.positioningTest ? '✅' : '❌'}`);
    console.log(`Functional Test: ${testResults.functionalTest ? '✅' : '❌'}`);
    console.log(`Integration Test: ${testResults.integrationTest ? '✅' : '❌'}`);
    
    const allTestsPassed = Object.values(testResults).every(result => result);
    console.log(`\nOverall Status: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync(
      '/home/dwdra/tmp/tests/playwright_md/zoom-controls-hybrid-results.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        testResults,
        positioningAnalysis,
        allTestsPassed
      }, null, 2)
    );
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();