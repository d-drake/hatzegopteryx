const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== Detailed Margin and Rotation Test ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    
    // Test side-by-side mode
    console.log('Testing side-by-side mode at 1800px:');
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(3000);
    
    // Inject debug info
    await page.evaluate(() => {
      const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
      if (!flexContainer) {
        console.log('Not in side-by-side mode');
        return;
      }
      
      // Get both charts
      const timelineChart = flexContainer.children[0];
      const varChart = flexContainer.children[1];
      
      // Analyze Timeline chart
      const timelineSvg = timelineChart?.querySelector('svg');
      console.log('Timeline Chart:');
      console.log('  SVG width:', timelineSvg?.getAttribute('width'));
      console.log('  Container width:', timelineChart?.getBoundingClientRect().width);
      
      // Analyze Variability chart
      const varSvg = varChart?.querySelector('svg');
      console.log('\nVariability Chart:');
      console.log('  SVG width:', varSvg?.getAttribute('width'));
      console.log('  Container width:', varChart?.getBoundingClientRect().width);
      
      // Check the g transform to get margins
      const varG = varSvg?.querySelector('g');
      const transform = varG?.getAttribute('transform');
      console.log('  Transform:', transform);
      
      // Calculate actual chart area
      const clipRect = varSvg?.querySelector('clipPath rect');
      console.log('  Clip rect width:', clipRect?.getAttribute('width'));
      console.log('  Clip rect height:', clipRect?.getAttribute('height'));
      
      // Calculate margins
      const svgWidth = parseFloat(varSvg?.getAttribute('width') || '0');
      const clipWidth = parseFloat(clipRect?.getAttribute('width') || '0');
      const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
      const leftMargin = match ? parseFloat(match[1]) : 0;
      const rightMargin = svgWidth - clipWidth - leftMargin;
      
      console.log('  Calculated left margin:', leftMargin);
      console.log('  Calculated right margin:', rightMargin);
      
      // Check for overlap in tick labels
      const xAxis = varSvg?.querySelector('.axis:last-child');
      const tickTexts = xAxis?.querySelectorAll('.tick text');
      console.log('\nX-Axis Tick Labels:');
      console.log('  Number of ticks:', tickTexts?.length);
      
      // Check each tick's position and rotation
      tickTexts?.forEach((text, i) => {
        const bbox = text.getBoundingClientRect();
        const transform = text.getAttribute('transform');
        console.log(`  Tick ${i}: width=${bbox.width.toFixed(1)}, transform=${transform || 'none'}`);
      });
      
      // Check for overlaps
      if (tickTexts && tickTexts.length > 1) {
        for (let i = 0; i < tickTexts.length - 1; i++) {
          const bbox1 = tickTexts[i].getBoundingClientRect();
          const bbox2 = tickTexts[i + 1].getBoundingClientRect();
          if (bbox1.right > bbox2.left) {
            console.log(`  OVERLAP detected between tick ${i} and ${i + 1}`);
          }
        }
      }
    });
    
    // Capture console output
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await page.waitForTimeout(2000);
    
    // Print captured logs
    console.log('\nBrowser console output:');
    logs.forEach(log => console.log(log));
    
    // Also check tabbed mode
    console.log('\n\nTesting tabbed mode at 1400px:');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(2000);
    
    // Click Variability tab
    await page.click('button:text("Variability")');
    await page.waitForTimeout(1000);
    
    const tabbedInfo = await page.evaluate(() => {
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
        rightMargin,
        transform
      };
    });
    
    console.log('Tabbed mode margins:');
    console.log(`  SVG width: ${tabbedInfo.svgWidth}`);
    console.log(`  Chart area width: ${tabbedInfo.clipWidth}`);
    console.log(`  Left margin: ${tabbedInfo.leftMargin}`);
    console.log(`  Right margin: ${tabbedInfo.rightMargin}`);
    
    console.log('\nBrowser will remain open for inspection...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();