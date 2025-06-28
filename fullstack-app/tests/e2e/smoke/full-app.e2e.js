const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  async function test(name, fn) {
    try {
      await fn();
      results.passed.push(name);
      console.log(`✅ ${name}`);
    } catch (error) {
      results.failed.push({ name, error: error.message });
      console.log(`❌ ${name}: ${error.message}`);
    }
  }
  
  try {
    console.log('=== Comprehensive E2E Test Suite ===\n');
    
    // 1. Homepage Tests
    await test('Homepage loads', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.waitForSelector('h1:has-text("Items")', { timeout: 10000 });
    });
    
    await test('Items CRUD operations', async () => {
      // Create item
      await page.fill('input[placeholder="Name"]', 'Test Item E2E');
      await page.fill('textarea[placeholder="Description"]', 'E2E Test Description');
      await page.click('button:has-text("Add Item")');
      await page.waitForSelector('text=Test Item E2E');
      
      // Delete item
      const deleteButton = await page.locator('li:has-text("Test Item E2E") button:has-text("Delete")').first();
      await deleteButton.click();
      await page.waitForSelector('text=Test Item E2E', { state: 'hidden' });
    });
    
    await test('CD Data section loads', async () => {
      await page.click('button:has-text("CD Data")');
      await page.waitForSelector('text=CD Data Statistics');
      await page.waitForSelector('table');
    });
    
    // 2. SPC Dashboard Navigation Tests
    await test('Navigate to SPC Dashboard', async () => {
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    });
    
    await test('SPC Dashboard title displays correctly', async () => {
      const title = await page.locator('h4').first().textContent();
      if (!title.includes('SPC_CD_L1') || !title.includes('1000-BNT44')) {
        throw new Error(`Unexpected title: ${title}`);
      }
    });
    
    // 3. Side-by-side Layout Tests
    await test('Side-by-side layout at 1800px', async () => {
      await page.setViewportSize({ width: 1800, height: 900 });
      await page.waitForTimeout(2000);
      
      const flexContainer = await page.locator('.flex.gap-\\[5px\\]');
      const count = await flexContainer.count();
      if (count === 0) throw new Error('Side-by-side layout not activated');
      
      const children = await flexContainer.locator('> div').count();
      if (children !== 2) throw new Error(`Expected 2 charts, found ${children}`);
    });
    
    await test('Tabbed layout at 1400px', async () => {
      await page.setViewportSize({ width: 1400, height: 900 });
      await page.waitForTimeout(2000);
      
      const tabs = await page.locator('button:has-text("Timeline"), button:has-text("Variability")');
      const tabCount = await tabs.count();
      if (tabCount !== 2) throw new Error(`Expected 2 tabs, found ${tabCount}`);
    });
    
    // 4. Chart Interaction Tests
    await test('Timeline tab interaction', async () => {
      await page.click('button:has-text("Timeline")');
      await page.waitForSelector('.timeline-chart', { timeout: 5000 });
    });
    
    await test('Variability tab interaction', async () => {
      await page.click('button:has-text("Variability")');
      await page.waitForSelector('.variability-chart', { timeout: 5000 });
    });
    
    // 5. Filter Controls Tests
    await test('Filter controls present', async () => {
      await page.setViewportSize({ width: 1800, height: 900 });
      await page.waitForTimeout(1000);
      
      const filterButton = await page.locator('button:has-text("Filters")');
      if (await filterButton.count() === 0) throw new Error('Filter button not found');
      
      await filterButton.click();
      await page.waitForSelector('text=Entity Filter', { timeout: 3000 });
    });
    
    await test('Entity filter interaction', async () => {
      // Should already have filters open from previous test
      const entityCheckbox = await page.locator('input[type="checkbox"]').first();
      await entityCheckbox.uncheck();
      await page.waitForTimeout(500);
      await entityCheckbox.check();
    });
    
    // 6. Zoom Controls Tests
    await test('Zoom controls visible', async () => {
      const zoomControls = await page.locator('.zoom-controls');
      if (await zoomControls.count() === 0) throw new Error('Zoom controls not found');
    });
    
    await test('Y-axis zoom interaction', async () => {
      // Close filters first
      await page.click('button:has-text("Filters")');
      await page.waitForTimeout(500);
      
      // Find y-axis zoom area
      const yAxisArea = await page.locator('rect[style*="cursor: ns-resize"]').first();
      const box = await yAxisArea.boundingBox();
      if (!box) throw new Error('Y-axis zoom area not found');
      
      // Simulate zoom
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(500);
      
      // Check zoom level changed
      const zoomText = await page.locator('.zoom-level').textContent();
      if (!zoomText || zoomText.includes('1.0x')) {
        results.warnings.push('Y-axis zoom may not have worked');
      }
    });
    
    // 7. Responsive Tests
    await test('Responsive behavior', async () => {
      const viewports = [
        { width: 2400, height: 900, expect: 'side-by-side' },
        { width: 1600, height: 900, expect: 'side-by-side' },
        { width: 1499, height: 900, expect: 'tabbed' },
        { width: 1200, height: 900, expect: 'tabbed' },
        { width: 768, height: 900, expect: 'tabbed' }
      ];
      
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(1000);
        
        const flexContainer = await page.locator('.flex.gap-\\[5px\\]').count();
        const tabs = await page.locator('button:has-text("Timeline"), button:has-text("Variability")').count();
        
        if (vp.expect === 'side-by-side' && flexContainer === 0) {
          throw new Error(`Expected side-by-side at ${vp.width}px`);
        }
        if (vp.expect === 'tabbed' && tabs === 0) {
          throw new Error(`Expected tabs at ${vp.width}px`);
        }
      }
    });
    
    // 8. Data Loading Tests
    await test('Charts display data points', async () => {
      await page.setViewportSize({ width: 1800, height: 900 });
      await page.waitForTimeout(2000);
      
      // Check for data elements
      const circles = await page.locator('circle.data-point').count();
      if (circles === 0) throw new Error('No data points found in charts');
    });
    
    // 9. Error Handling Tests
    await test('Invalid route handling', async () => {
      await page.goto('http://localhost:3000/spc-dashboard/INVALID/ROUTE');
      // Should either show error or redirect - just check it doesn't crash
      await page.waitForTimeout(2000);
      const title = await page.title();
      if (!title) throw new Error('Page crashed on invalid route');
    });
    
    // 10. Performance Tests
    await test('Page load performance', async () => {
      const startTime = Date.now();
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
      if (loadTime > 5000) {
        results.warnings.push(`Slow page load: ${loadTime}ms`);
      }
    });
    
    // 11. Console Error Check
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await test('No console errors', async () => {
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForTimeout(3000);
      
      if (consoleErrors.length > 0) {
        throw new Error(`Console errors detected: ${consoleErrors.join(', ')}`);
      }
    });
    
    // Print results
    console.log('\n=== Test Results ===');
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    
    if (results.failed.length > 0) {
      console.log('\nFailed tests:');
      results.failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    }
    
    if (results.warnings.length > 0) {
      console.log('\nWarnings:');
      results.warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.passed.length + results.failed.length,
        passed: results.passed.length,
        failed: results.failed.length,
        warnings: results.warnings.length
      },
      results: results
    };
    
    require('fs').writeFileSync(
      '~/tmp/tests/playwright_md/e2e-test-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('\nDetailed report saved to: ~/tmp/tests/playwright_md/e2e-test-report.json');
    
  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    await browser.close();
  }
})();