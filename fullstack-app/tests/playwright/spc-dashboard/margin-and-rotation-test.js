const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Margin and Label Rotation Test ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    
    // Test tabbed mode (should have right margin)
    console.log('1. Testing tabbed mode (1400px):');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(2000);
    
    // Click on Variability tab
    await page.click('button:text("Variability")');
    await page.waitForTimeout(1000);
    
    const tabbedResult = await page.evaluate(() => {
      const svg = document.querySelector('.variability-chart');
      const gTransform = svg?.querySelector('g')?.getAttribute('transform');
      const axisBottom = svg?.querySelector('.axis:last-child');
      const tickTexts = axisBottom?.querySelectorAll('.tick text');
      
      // Check if any tick texts are rotated
      let hasRotation = false;
      tickTexts?.forEach(text => {
        const transform = text.getAttribute('transform');
        if (transform && transform.includes('rotate')) {
          hasRotation = true;
        }
      });
      
      return {
        svgWidth: svg?.getAttribute('width'),
        transform: gTransform,
        tickCount: tickTexts?.length,
        hasRotation: hasRotation
      };
    });
    
    console.log(`  SVG Width: ${tabbedResult.svgWidth}px`);
    console.log(`  Transform: ${tabbedResult.transform}`);
    console.log(`  Tick count: ${tabbedResult.tickCount}`);
    console.log(`  Labels rotated: ${tabbedResult.hasRotation ? 'Yes' : 'No'}`);
    
    // Test side-by-side mode (should have no right margin)
    console.log('\n2. Testing side-by-side mode (1800px):');
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    const sideBySideResult = await page.evaluate(() => {
      const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
      if (!flexContainer) return { mode: 'tabbed' };
      
      const varChart = flexContainer.children[1];
      const svg = varChart?.querySelector('.variability-chart');
      const gTransform = svg?.querySelector('g')?.getAttribute('transform');
      const axisBottom = svg?.querySelector('.axis:last-child');
      const tickTexts = axisBottom?.querySelectorAll('.tick text');
      
      // Check if any tick texts are rotated
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
      
      // Check margins by looking at chart area width vs SVG width
      const svgWidth = parseFloat(svg?.getAttribute('width') || '0');
      const chartArea = svg?.querySelector('.chart-area');
      const chartAreaBox = chartArea?.getBoundingClientRect();
      const gElement = svg?.querySelector('g');
      const gBox = gElement?.getBoundingClientRect();
      
      // Parse transform to get margins
      let leftMargin = 0;
      if (gTransform) {
        const match = gTransform.match(/translate\(([^,]+),([^)]+)\)/);
        if (match) {
          leftMargin = parseFloat(match[1]);
        }
      }
      
      return {
        mode: 'side-by-side',
        svgWidth: svgWidth,
        transform: gTransform,
        leftMargin: leftMargin,
        rightMargin: svgWidth - (chartAreaBox?.width || 0) - leftMargin,
        tickCount: tickTexts?.length,
        hasRotation: hasRotation,
        rotationAngle: rotationAngle
      };
    });
    
    console.log(`  Mode: ${sideBySideResult.mode}`);
    console.log(`  SVG Width: ${sideBySideResult.svgWidth}px`);
    console.log(`  Transform: ${sideBySideResult.transform}`);
    console.log(`  Left margin: ${sideBySideResult.leftMargin}px`);
    console.log(`  Right margin: ${sideBySideResult.rightMargin}px`);
    console.log(`  Tick count: ${sideBySideResult.tickCount}`);
    console.log(`  Labels rotated: ${sideBySideResult.hasRotation ? 'Yes' : 'No'}`);
    if (sideBySideResult.rotationAngle) {
      console.log(`  Rotation angle: ${sideBySideResult.rotationAngle}°`);
    }
    
    // Force overlap scenario by narrowing the chart
    console.log('\n3. Testing forced overlap scenario:');
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.waitForTimeout(2000);
    
    const overlapResult = await page.evaluate(() => {
      const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
      if (!flexContainer) return { mode: 'tabbed' };
      
      const varChart = flexContainer.children[1];
      const svg = varChart?.querySelector('.variability-chart');
      const axisBottom = svg?.querySelector('.axis:last-child');
      const tickTexts = axisBottom?.querySelectorAll('.tick text');
      
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
        tickCount: tickTexts?.length,
        hasRotation: hasRotation,
        rotationAngle: rotationAngle,
        chartWidth: varChart?.getBoundingClientRect().width
      };
    });
    
    console.log(`  Chart width: ${overlapResult.chartWidth}px`);
    console.log(`  Tick count: ${overlapResult.tickCount}`);
    console.log(`  Labels rotated: ${overlapResult.hasRotation ? 'Yes' : 'No'}`);
    if (overlapResult.rotationAngle) {
      console.log(`  Rotation angle: ${overlapResult.rotationAngle}°`);
    }
    
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();