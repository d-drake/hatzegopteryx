const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Final Margin and Rotation Test ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    
    // 1. Test side-by-side mode
    console.log('1. Side-by-side mode (1800px):');
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(3000);
    
    const sideBySideResult = await page.evaluate(() => {
      const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
      if (!flexContainer) return { error: 'Not in side-by-side mode' };
      
      const varChart = flexContainer.children[1];
      const varSvg = varChart?.querySelector('svg');
      const varG = varSvg?.querySelector('g');
      const transform = varG?.getAttribute('transform');
      const clipRect = varSvg?.querySelector('clipPath rect');
      
      // Calculate margins
      const svgWidth = parseFloat(varSvg?.getAttribute('width') || '0');
      const clipWidth = parseFloat(clipRect?.getAttribute('width') || '0');
      const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
      const leftMargin = match ? parseFloat(match[1]) : 0;
      const rightMargin = svgWidth - clipWidth - leftMargin;
      
      // Check tick rotation
      const xAxis = varSvg?.querySelector('.axis:last-child');
      const tickTexts = xAxis?.querySelectorAll('.tick text');
      let hasRotation = false;
      let rotationAngle = null;
      
      tickTexts?.forEach(text => {
        const transform = text.getAttribute('transform');
        if (transform && transform.includes('rotate')) {
          hasRotation = true;
          const match = transform.match(/rotate\(([^)]+)\)/);
          if (match) rotationAngle = match[1];
        }
      });
      
      return {
        svgWidth,
        clipWidth,
        leftMargin,
        rightMargin,
        tickCount: tickTexts?.length,
        hasRotation,
        rotationAngle
      };
    });
    
    console.log(`  SVG width: ${sideBySideResult.svgWidth}px`);
    console.log(`  Chart area width: ${sideBySideResult.clipWidth}px`);
    console.log(`  Left margin: ${sideBySideResult.leftMargin}px`);
    console.log(`  Right margin: ${sideBySideResult.rightMargin}px (should be 0)`);
    console.log(`  Tick labels: ${sideBySideResult.tickCount}, rotated: ${sideBySideResult.hasRotation}`);
    
    // Take screenshot
    const timestamp1 = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `~/tmp/tests/playwright_png/margin-test-sidebyside-${timestamp1}.png`,
      fullPage: false,
      clip: { x: 0, y: 100, width: 1800, height: 600 }
    });
    
    // 2. Test tabbed mode  
    console.log('\n2. Tabbed mode (1400px):');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(2000);
    
    // Click Variability tab
    await page.click('button:text("Variability")');
    await page.waitForTimeout(1000);
    
    const tabbedResult = await page.evaluate(() => {
      const svg = document.querySelector('.variability-chart');
      const g = svg?.querySelector('g');
      const transform = g?.getAttribute('transform');
      const clipRect = svg?.querySelector('clipPath rect');
      
      const svgWidth = parseFloat(svg?.getAttribute('width') || '0');
      const clipWidth = parseFloat(clipRect?.getAttribute('width') || '0');
      const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
      const leftMargin = match ? parseFloat(match[1]) : 0;
      const rightMargin = svgWidth - clipWidth - leftMargin;
      
      return {
        svgWidth,
        clipWidth,
        leftMargin,
        rightMargin
      };
    });
    
    console.log(`  SVG width: ${tabbedResult.svgWidth}px`);
    console.log(`  Chart area width: ${tabbedResult.clipWidth}px`);
    console.log(`  Left margin: ${tabbedResult.leftMargin}px`);
    console.log(`  Right margin: ${tabbedResult.rightMargin}px (should be 240)`);
    
    // Take screenshot
    const timestamp2 = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `~/tmp/tests/playwright_png/margin-test-tabbed-${timestamp2}.png`,
      fullPage: false,
      clip: { x: 0, y: 100, width: 1400, height: 600 }
    });
    
    // 3. Test narrow side-by-side to trigger label rotation
    console.log('\n3. Narrow side-by-side (1500px) - should trigger rotation:');
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.waitForTimeout(3000);
    
    // Add overlapping labels artificially by modifying tick spacing
    await page.evaluate(() => {
      const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
      if (!flexContainer) return;
      
      const varChart = flexContainer.children[1];
      const xAxis = varChart?.querySelector('.axis:last-child');
      const tickTexts = xAxis?.querySelectorAll('.tick text');
      
      // Log tick positions
      console.log('Tick positions:');
      tickTexts?.forEach((text, i) => {
        const bbox = text.getBoundingClientRect();
        console.log(`Tick ${i}: left=${bbox.left.toFixed(1)}, right=${bbox.right.toFixed(1)}, width=${bbox.width.toFixed(1)}`);
      });
    });
    
    await page.waitForTimeout(1000);
    
    const narrowResult = await page.evaluate(() => {
      const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
      if (!flexContainer) return { error: 'Not in side-by-side mode' };
      
      const varChart = flexContainer.children[1];
      const xAxis = varChart?.querySelector('.axis:last-child');
      const tickTexts = xAxis?.querySelectorAll('.tick text');
      
      let hasRotation = false;
      let rotationAngle = null;
      
      tickTexts?.forEach(text => {
        const transform = text.getAttribute('transform');
        if (transform && transform.includes('rotate')) {
          hasRotation = true;
          const match = transform.match(/rotate\(([^)]+)\)/);
          if (match) rotationAngle = match[1];
        }
      });
      
      return {
        chartWidth: varChart?.getBoundingClientRect().width,
        tickCount: tickTexts?.length,
        hasRotation,
        rotationAngle
      };
    });
    
    console.log(`  Variability chart width: ${narrowResult.chartWidth}px`);
    console.log(`  Tick count: ${narrowResult.tickCount}`);
    console.log(`  Labels rotated: ${narrowResult.hasRotation ? `Yes (${narrowResult.rotationAngle}°)` : 'No'}`);
    
    // Take screenshot
    const timestamp3 = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `~/tmp/tests/playwright_png/margin-test-narrow-${timestamp3}.png`,
      fullPage: false,
      clip: { x: 0, y: 100, width: 1500, height: 600 }
    });
    
    console.log('\n✅ Test completed. Screenshots saved.');
    console.log('\nSummary:');
    console.log(`- Side-by-side mode: Right margin = ${sideBySideResult.rightMargin}px (expected: 0)`);
    console.log(`- Tabbed mode: Right margin = ${tabbedResult.rightMargin}px (expected: 240)`);
    console.log(`- Label rotation: ${narrowResult.hasRotation ? 'Working' : 'May need narrower width to trigger'}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();