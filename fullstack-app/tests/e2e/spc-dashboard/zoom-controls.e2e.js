const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const results = {
    passed: [],
    failed: [],
    details: []
  };
  
  async function test(name, fn) {
    try {
      const result = await fn();
      results.passed.push(name);
      results.details.push({ name, status: 'passed', ...result });
      console.log(`✅ ${name}`);
      if (result) {
        Object.entries(result).forEach(([key, value]) => {
          if (key !== 'status') console.log(`   ${key}: ${value}`);
        });
      }
    } catch (error) {
      results.failed.push({ name, error: error.message });
      results.details.push({ name, status: 'failed', error: error.message });
      console.log(`❌ ${name}: ${error.message}`);
    }
  }
  
  try {
    console.log('=== Comprehensive Zoom Controls Test ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    
    // Test both tabbed and side-by-side modes
    for (const mode of ['tabbed', 'side-by-side']) {
      console.log(`\n--- Testing ${mode} mode ---`);
      
      // Set viewport
      const width = mode === 'tabbed' ? 1400 : 1800;
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(2000);
      
      // For tabbed mode, ensure Timeline tab is active
      if (mode === 'tabbed') {
        await page.click('button:has-text("Timeline")');
        await page.waitForTimeout(1000);
      }
      
      await test(`${mode}: Zoom controls visible`, async () => {
        const zoomControls = await page.locator('.zoom-controls').count();
        if (zoomControls === 0) throw new Error('No zoom controls found');
        return { count: zoomControls };
      });
      
      await test(`${mode}: Initial zoom levels`, async () => {
        const zoomText = await page.locator('.zoom-level').first().textContent();
        if (!zoomText) throw new Error('No zoom level text found');
        
        // Parse zoom levels
        const xMatch = zoomText.match(/X:\s*([\d.]+)x/);
        const yMatch = zoomText.match(/Y:\s*([\d.]+)x/);
        const y2Match = zoomText.match(/Y2:\s*([\d.]+)x/);
        
        return {
          text: zoomText,
          xZoom: xMatch ? xMatch[1] : 'not found',
          yZoom: yMatch ? yMatch[1] : 'not found',
          y2Zoom: y2Match ? y2Match[1] : 'not found'
        };
      });
      
      await test(`${mode}: X-axis zoom interaction`, async () => {
        // Find x-axis zoom area
        const xAxisArea = await page.locator('rect[style*="cursor: ew-resize"]').first();
        const box = await xAxisArea.boundingBox();
        if (!box) throw new Error('X-axis zoom area not found');
        
        // Zoom in
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(500);
        
        // Check zoom changed
        const zoomText = await page.locator('.zoom-level').first().textContent();
        const xMatch = zoomText.match(/X:\s*([\d.]+)x/);
        const xZoom = xMatch ? parseFloat(xMatch[1]) : 0;
        
        if (xZoom <= 1.0) throw new Error('X-axis zoom did not increase');
        
        return { 
          afterZoom: xZoom,
          zoomText: zoomText
        };
      });
      
      await test(`${mode}: Y-axis zoom interaction`, async () => {
        // Find y-axis zoom area
        const yAxisArea = await page.locator('rect[style*="cursor: ns-resize"]').first();
        const box = await yAxisArea.boundingBox();
        if (!box) throw new Error('Y-axis zoom area not found');
        
        // Zoom in
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(500);
        
        // Check zoom changed
        const zoomText = await page.locator('.zoom-level').first().textContent();
        const yMatch = zoomText.match(/Y:\s*([\d.]+)x/);
        const yZoom = yMatch ? parseFloat(yMatch[1]) : 0;
        
        if (yZoom <= 1.0) throw new Error('Y-axis zoom did not increase');
        
        return { 
          afterZoom: yZoom,
          zoomText: zoomText
        };
      });
      
      await test(`${mode}: Y2-axis zoom interaction`, async () => {
        // Find y2-axis zoom area
        const y2AxisArea = await page.locator('rect[style*="cursor: ns-resize"]').nth(1);
        const count = await y2AxisArea.count();
        
        if (count === 0) {
          return { note: 'No Y2 axis in this view' };
        }
        
        const box = await y2AxisArea.boundingBox();
        if (!box) throw new Error('Y2-axis zoom area not found');
        
        // Zoom in
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(500);
        
        // Check zoom changed
        const zoomText = await page.locator('.zoom-level').first().textContent();
        const y2Match = zoomText.match(/Y2:\s*([\d.]+)x/);
        const y2Zoom = y2Match ? parseFloat(y2Match[1]) : 0;
        
        if (y2Zoom <= 1.0) throw new Error('Y2-axis zoom did not increase');
        
        return { 
          afterZoom: y2Zoom,
          zoomText: zoomText
        };
      });
      
      await test(`${mode}: Reset zoom button exists`, async () => {
        const resetButton = await page.locator('button:has-text("Reset Zoom")');
        const count = await resetButton.count();
        if (count === 0) throw new Error('Reset zoom button not found');
        
        const isEnabled = await resetButton.first().isEnabled();
        return { 
          buttonCount: count,
          isEnabled: isEnabled
        };
      });
      
      await test(`${mode}: Reset zoom functionality`, async () => {
        // Get current zoom levels
        const beforeText = await page.locator('.zoom-level').first().textContent();
        
        // Click reset
        await page.click('button:has-text("Reset Zoom")');
        await page.waitForTimeout(1000);
        
        // Get new zoom levels
        const afterText = await page.locator('.zoom-level').first().textContent();
        
        // Parse levels
        const afterXMatch = afterText.match(/X:\s*([\d.]+)x/);
        const afterYMatch = afterText.match(/Y:\s*([\d.]+)x/);
        const afterY2Match = afterText.match(/Y2:\s*([\d.]+)x/);
        
        const xZoom = afterXMatch ? parseFloat(afterXMatch[1]) : 0;
        const yZoom = afterYMatch ? parseFloat(afterYMatch[1]) : 0;
        const y2Zoom = afterY2Match ? parseFloat(afterY2Match[1]) : null;
        
        // All should be 1.0
        if (Math.abs(xZoom - 1.0) > 0.01) throw new Error(`X zoom not reset: ${xZoom}`);
        if (Math.abs(yZoom - 1.0) > 0.01) throw new Error(`Y zoom not reset: ${yZoom}`);
        if (y2Zoom !== null && Math.abs(y2Zoom - 1.0) > 0.01) throw new Error(`Y2 zoom not reset: ${y2Zoom}`);
        
        return {
          before: beforeText,
          after: afterText,
          xReset: xZoom === 1.0,
          yReset: yZoom === 1.0,
          y2Reset: y2Zoom === null || y2Zoom === 1.0
        };
      });
      
      // Test zoom persistence when switching tabs (tabbed mode only)
      if (mode === 'tabbed') {
        await test('Zoom persistence across tabs', async () => {
          // Zoom in on X axis
          const xAxisArea = await page.locator('rect[style*="cursor: ew-resize"]').first();
          const box = await xAxisArea.boundingBox();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.wheel(0, -150);
          await page.waitForTimeout(500);
          
          // Get zoom level
          const timelineZoom = await page.locator('.zoom-level').first().textContent();
          
          // Switch to Variability tab
          await page.click('button:has-text("Variability")');
          await page.waitForTimeout(1000);
          
          // Switch back to Timeline
          await page.click('button:has-text("Timeline")');
          await page.waitForTimeout(1000);
          
          // Check zoom persisted
          const afterSwitchZoom = await page.locator('.zoom-level').first().textContent();
          
          if (timelineZoom !== afterSwitchZoom) {
            throw new Error('Zoom level not persisted across tab switches');
          }
          
          return {
            zoomBeforeSwitch: timelineZoom,
            zoomAfterSwitch: afterSwitchZoom,
            persisted: true
          };
        });
      }
    }
    
    // Test edge cases
    console.log('\n--- Testing edge cases ---');
    
    await test('Multiple rapid zoom interactions', async () => {
      await page.setViewportSize({ width: 1800, height: 900 });
      await page.waitForTimeout(1000);
      
      const xAxisArea = await page.locator('rect[style*="cursor: ew-resize"]').first();
      const box = await xAxisArea.boundingBox();
      
      // Rapid zoom in/out
      for (let i = 0; i < 5; i++) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, i % 2 === 0 ? -50 : 50);
        await page.waitForTimeout(100);
      }
      
      // Should still be functional
      const zoomText = await page.locator('.zoom-level').first().textContent();
      if (!zoomText || zoomText.includes('NaN')) {
        throw new Error('Zoom controls broken after rapid interaction');
      }
      
      return { finalZoomText: zoomText };
    });
    
    await test('Reset after complex zoom state', async () => {
      // Zoom all axes
      const areas = await page.locator('rect[style*="cursor:"]').all();
      for (const area of areas) {
        const box = await area.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.wheel(0, -100);
          await page.waitForTimeout(200);
        }
      }
      
      // Reset
      await page.click('button:has-text("Reset Zoom")');
      await page.waitForTimeout(1000);
      
      // Verify all reset
      const zoomText = await page.locator('.zoom-level').first().textContent();
      const allOne = zoomText.match(/1\.0x/g);
      
      if (!allOne || allOne.length < 2) {
        throw new Error('Not all axes reset to 1.0x');
      }
      
      return { 
        zoomTextAfterReset: zoomText,
        resetCount: allOne.length
      };
    });
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${results.passed.length}`);
    console.log(`Failed: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
      console.log('\nFailed tests:');
      results.failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.passed.length + results.failed.length,
        passed: results.passed.length,
        failed: results.failed.length
      },
      details: results.details
    };
    
    require('fs').writeFileSync(
      '~/tmp/tests/playwright_md/zoom-controls-test-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('\nDetailed report saved to: ~/tmp/tests/playwright_md/zoom-controls-test-report.json');
    console.log('\nBrowser will remain open for manual inspection...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    await browser.close();
  }
})();