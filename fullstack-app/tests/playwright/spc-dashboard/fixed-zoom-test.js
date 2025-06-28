const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== Fixed Zoom Test ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Test side-by-side mode
    console.log('1. Testing side-by-side mode (1800px):');
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Check zoom controls
    const zoomControls = await page.locator('.zoom-controls').count();
    console.log(`  Zoom controls found: ${zoomControls}`);
    
    if (zoomControls > 0) {
      // Get initial state
      const initialZoom = await page.locator('.zoom-level').first().textContent();
      console.log(`  Initial zoom: ${initialZoom}`);
      
      // Test X-axis zoom
      console.log('\n  Testing X-axis zoom:');
      const xAxisArea = await page.locator('rect[style*="cursor: ew-resize"]').first();
      const xBox = await xAxisArea.boundingBox();
      
      if (xBox) {
        await page.mouse.move(xBox.x + xBox.width / 2, xBox.y + xBox.height / 2);
        await page.mouse.wheel(0, -200); // Stronger zoom
        await page.waitForTimeout(1000);
        
        const afterXZoom = await page.locator('.zoom-level').first().textContent();
        console.log(`    After X zoom: ${afterXZoom}`);
        
        // Parse zoom levels
        const xMatch = afterXZoom.match(/X:\s*([\d.]+)x/);
        const xLevel = xMatch ? parseFloat(xMatch[1]) : 1;
        console.log(`    X zoom level: ${xLevel}`);
        
        if (xLevel > 1) {
          console.log('    ✅ X-axis zoom working!');
        } else {
          console.log('    ❌ X-axis zoom not working');
        }
      }
      
      // Test Y-axis zoom
      console.log('\n  Testing Y-axis zoom:');
      const yAxisArea = await page.locator('rect[style*="cursor: ns-resize"]').first();
      const yBox = await yAxisArea.boundingBox();
      
      if (yBox) {
        await page.mouse.move(yBox.x + yBox.width / 2, yBox.y + yBox.height / 2);
        await page.mouse.wheel(0, -200);
        await page.waitForTimeout(1000);
        
        const afterYZoom = await page.locator('.zoom-level').first().textContent();
        console.log(`    After Y zoom: ${afterYZoom}`);
        
        const yMatch = afterYZoom.match(/Y:\s*([\d.]+)x/);
        const yLevel = yMatch ? parseFloat(yMatch[1]) : 1;
        console.log(`    Y zoom level: ${yLevel}`);
        
        if (yLevel > 1) {
          console.log('    ✅ Y-axis zoom working!');
        } else {
          console.log('    ❌ Y-axis zoom not working');
        }
      }
      
      // Test Y2-axis zoom
      console.log('\n  Testing Y2-axis zoom:');
      const y2AxisArea = await page.locator('rect[style*="cursor: ns-resize"]').nth(1);
      const y2Count = await y2AxisArea.count();
      
      if (y2Count > 0) {
        const y2Box = await y2AxisArea.boundingBox();
        if (y2Box) {
          await page.mouse.move(y2Box.x + y2Box.width / 2, y2Box.y + y2Box.height / 2);
          await page.mouse.wheel(0, -200);
          await page.waitForTimeout(1000);
          
          const afterY2Zoom = await page.locator('.zoom-level').first().textContent();
          console.log(`    After Y2 zoom: ${afterY2Zoom}`);
          
          const y2Match = afterY2Zoom.match(/Y2:\s*([\d.]+)x/);
          const y2Level = y2Match ? parseFloat(y2Match[1]) : 1;
          console.log(`    Y2 zoom level: ${y2Level}`);
          
          if (y2Level > 1) {
            console.log('    ✅ Y2-axis zoom working!');
          } else {
            console.log('    ❌ Y2-axis zoom not working');
          }
        }
      } else {
        console.log('    No Y2 axis in this view');
      }
      
      // Test Reset button
      console.log('\n  Testing Reset button:');
      const resetButton = await page.locator('button:has-text("Reset Zoom")').first();
      const isEnabled = await resetButton.isEnabled();
      console.log(`    Reset button enabled: ${isEnabled}`);
      
      if (isEnabled) {
        await resetButton.click();
        await page.waitForTimeout(1000);
        
        const afterReset = await page.locator('.zoom-level').first().textContent();
        console.log(`    After reset: ${afterReset}`);
        
        // Check all are back to 1.0x
        const allOne = afterReset.match(/1\.0x/g);
        if (allOne && allOne.length >= 2) {
          console.log('    ✅ Reset working - all axes back to 1.0x');
        } else {
          console.log('    ❌ Reset not working properly');
        }
      }
    }
    
    // Test tabbed mode
    console.log('\n2. Testing tabbed mode (1400px):');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(2000);
    
    // Check if tabs exist
    const tabs = await page.locator('button').filter({ hasText: /Timeline|Variability/ }).count();
    console.log(`  Tab buttons found: ${tabs}`);
    
    if (tabs > 0) {
      // Click on Timeline tab
      const timelineTab = await page.locator('button').filter({ hasText: 'Timeline' }).first();
      await timelineTab.click();
      await page.waitForTimeout(1000);
      
      // Test zoom in tabbed mode
      const tabbedZoomControls = await page.locator('.zoom-controls').count();
      console.log(`  Zoom controls in tabbed mode: ${tabbedZoomControls}`);
      
      if (tabbedZoomControls > 0) {
        const tabbedInitial = await page.locator('.zoom-level').first().textContent();
        console.log(`  Initial zoom: ${tabbedInitial}`);
      }
    }
    
    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `~/tmp/tests/playwright_png/fixed-zoom-test-${timestamp}.png`,
      fullPage: false
    });
    
    console.log('\n✅ Test completed');
    console.log('Browser will remain open for inspection...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();