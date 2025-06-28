const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  async function test(name, fn) {
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      results.passed++;
      results.tests.push({ name, status: 'passed', duration });
      console.log(`✅ ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      results.failed++;
      results.tests.push({ name, status: 'failed', error: error.message, duration });
      console.log(`❌ ${name} (${duration}ms): ${error.message}`);
    }
  }
  
  try {
    console.log('=== Focused E2E Test Suite ===\n');
    
    // Test SPC Dashboard functionality
    await test('Load SPC Dashboard', async () => {
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    });
    
    await test('Check page title contains chart info', async () => {
      const title = await page.locator('h4').first().textContent();
      if (!title) throw new Error('No title found');
      console.log(`  Title: ${title}`);
    });
    
    await test('Side-by-side layout at 1800px', async () => {
      await page.setViewportSize({ width: 1800, height: 900 });
      await page.waitForTimeout(2000);
      
      const flexContainer = await page.locator('.flex.gap-\\[5px\\]').count();
      if (flexContainer === 0) throw new Error('Side-by-side layout not found');
      
      // Check both charts are present
      const charts = await page.locator('.flex.gap-\\[5px\\] > div').count();
      console.log(`  Found ${charts} charts in side-by-side mode`);
    });
    
    await test('Check SVG dimensions in side-by-side', async () => {
      const svgs = await page.locator('svg').all();
      console.log(`  Found ${svgs.length} SVG elements`);
      
      for (let i = 0; i < Math.min(2, svgs.length); i++) {
        const width = await svgs[i].getAttribute('width');
        const height = await svgs[i].getAttribute('height');
        console.log(`  SVG ${i + 1}: ${width}x${height}`);
      }
    });
    
    await test('No overflow in side-by-side mode', async () => {
      const result = await page.evaluate(() => {
        const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
        if (!flexContainer) return { error: 'No flex container' };
        
        const charts = Array.from(flexContainer.children);
        const overflows = charts.map((chart, i) => ({
          index: i,
          hasOverflow: chart.scrollWidth > chart.clientWidth
        }));
        
        return { overflows };
      });
      
      if (result.error) throw new Error(result.error);
      
      const hasOverflow = result.overflows.some(o => o.hasOverflow);
      if (hasOverflow) {
        throw new Error('Overflow detected in charts');
      }
      console.log('  No overflow detected');
    });
    
    await test('Tabbed layout at 1400px', async () => {
      await page.setViewportSize({ width: 1400, height: 900 });
      await page.waitForTimeout(2000);
      
      const tabs = await page.locator('button').filter({ hasText: /Timeline|Variability/ }).count();
      if (tabs === 0) throw new Error('No tabs found');
      console.log(`  Found ${tabs} tab buttons`);
    });
    
    await test('Tab switching works', async () => {
      // Click Variability tab
      await page.locator('button').filter({ hasText: 'Variability' }).first().click();
      await page.waitForTimeout(1000);
      
      // Check for variability chart
      const varChart = await page.locator('.variability-chart').count();
      if (varChart === 0) throw new Error('Variability chart not found');
      
      // Click Timeline tab
      await page.locator('button').filter({ hasText: 'Timeline' }).first().click();
      await page.waitForTimeout(1000);
      
      // Check for timeline chart
      const timelineChart = await page.locator('.timeline-chart').count();
      if (timelineChart === 0) throw new Error('Timeline chart not found');
    });
    
    await test('Zoom controls present', async () => {
      const zoomControls = await page.locator('.zoom-controls').count();
      if (zoomControls === 0) throw new Error('No zoom controls found');
      console.log(`  Found ${zoomControls} zoom control(s)`);
    });
    
    await test('Check margin changes in Variability chart', async () => {
      // First check side-by-side
      await page.setViewportSize({ width: 1800, height: 900 });
      await page.waitForTimeout(2000);
      
      const sideBySideMargin = await page.evaluate(() => {
        const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
        if (!flexContainer) return null;
        
        const varChart = flexContainer.children[1];
        const svg = varChart?.querySelector('svg');
        const clipRect = svg?.querySelector('clipPath rect');
        
        const svgWidth = parseFloat(svg?.getAttribute('width') || '0');
        const clipWidth = parseFloat(clipRect?.getAttribute('width') || '0');
        const g = svg?.querySelector('g');
        const transform = g?.getAttribute('transform');
        const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
        const leftMargin = match ? parseFloat(match[1]) : 0;
        
        return svgWidth - clipWidth - leftMargin;
      });
      
      // Then check tabbed
      await page.setViewportSize({ width: 1400, height: 900 });
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: 'Variability' }).first().click();
      await page.waitForTimeout(1000);
      
      const tabbedMargin = await page.evaluate(() => {
        const svg = document.querySelector('.variability-chart');
        const clipRect = svg?.querySelector('clipPath rect');
        
        const svgWidth = parseFloat(svg?.getAttribute('width') || '0');
        const clipWidth = parseFloat(clipRect?.getAttribute('width') || '0');
        const g = svg?.querySelector('g');
        const transform = g?.getAttribute('transform');
        const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
        const leftMargin = match ? parseFloat(match[1]) : 0;
        
        return svgWidth - clipWidth - leftMargin;
      });
      
      console.log(`  Side-by-side right margin: ${sideBySideMargin}px (expected: 0)`);
      console.log(`  Tabbed right margin: ${tabbedMargin}px (expected: 240)`);
      
      if (sideBySideMargin > 10) {
        throw new Error(`Side-by-side margin too large: ${sideBySideMargin}px`);
      }
      if (Math.abs(tabbedMargin - 240) > 10) {
        throw new Error(`Tabbed margin incorrect: ${tabbedMargin}px`);
      }
    });
    
    await test('Performance check', async () => {
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart
        };
      });
      
      console.log(`  DOM Content Loaded: ${metrics.domContentLoaded}ms`);
      console.log(`  Load Complete: ${metrics.loadComplete}ms`);
      
      if (metrics.loadComplete > 3000) {
        throw new Error(`Page load too slow: ${metrics.loadComplete}ms`);
      }
    });
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`Total tests: ${results.passed + results.failed}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.passed + results.failed,
        passed: results.passed,
        failed: results.failed,
        successRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(1) + '%'
      },
      tests: results.tests
    };
    
    require('fs').writeFileSync(
      '~/tmp/tests/playwright_md/focused-e2e-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('\nReport saved to: ~/tmp/tests/playwright_md/focused-e2e-report.json');
    
    if (results.failed > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Test suite error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();