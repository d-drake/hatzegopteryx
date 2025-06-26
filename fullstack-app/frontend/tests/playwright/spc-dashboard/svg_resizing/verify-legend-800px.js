const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Set viewport to 800px width to match user's screenshot
    await page.setViewportSize({ width: 800, height: 600 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Take a screenshot to see the issue
    await page.screenshot({ 
      path: 'tests/legend-800px-viewport.png',
      fullPage: true 
    });
    
    // Check viewport and container sizes
    const dimensions = await page.evaluate(() => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      const containers = [];
      document.querySelectorAll('div.bg-white.p-4.rounded-lg.shadow').forEach((container, index) => {
        const rect = container.getBoundingClientRect();
        const svg = container.querySelector('svg');
        const svgRect = svg ? svg.getBoundingClientRect() : null;
        
        containers.push({
          index,
          containerWidth: rect.width,
          containerRight: rect.right,
          svgWidth: svgRect ? svgRect.width : 0,
          svgRight: svgRect ? svgRect.right : 0
        });
      });
      
      return { viewport, containers };
    });
    
    console.log('Viewport dimensions:', dimensions.viewport);
    console.log('\nContainer analysis:');
    dimensions.containers.forEach(c => {
      console.log(`Container ${c.index}: width=${c.containerWidth}px, right=${c.containerRight}px`);
      console.log(`  SVG: width=${c.svgWidth}px, right=${c.svgRight}px`);
      console.log(`  SVG extends beyond viewport: ${c.svgRight > dimensions.viewport.width}`);
    });
    
    // Check legend visibility
    const legendCheck = await page.evaluate(() => {
      const results = [];
      const viewportWidth = window.innerWidth;
      
      document.querySelectorAll('text').forEach(text => {
        const content = text.textContent || '';
        if (content === 'fake property1' || content === 'bias' || content.includes('FP1_')) {
          const rect = text.getBoundingClientRect();
          const svg = text.closest('svg');
          const svgRect = svg ? svg.getBoundingClientRect() : null;
          
          // Get computed text length
          const textLength = text.getComputedTextLength ? text.getComputedTextLength() : 0;
          
          results.push({
            text: content,
            textLeft: rect.left,
            textRight: rect.right,
            textWidth: rect.width,
            computedLength: textLength,
            svgRight: svgRect ? svgRect.right : 0,
            viewportWidth: viewportWidth,
            isInViewport: rect.right <= viewportWidth,
            isInSvg: svgRect ? rect.right <= svgRect.right : false,
            viewportOverflow: Math.max(0, rect.right - viewportWidth),
            svgOverflow: svgRect ? Math.max(0, rect.right - svgRect.right) : 0
          });
        }
      });
      
      return results.filter(r => r.text === 'fake property1' || r.text === 'bias');
    });
    
    console.log('\nLegend visibility analysis:');
    legendCheck.forEach(item => {
      console.log(`\n"${item.text}":`);
      console.log(`  Position: left=${item.textLeft.toFixed(1)}px, right=${item.textRight.toFixed(1)}px`);
      console.log(`  Width: ${item.textWidth.toFixed(1)}px (computed: ${item.computedLength.toFixed(1)}px)`);
      console.log(`  SVG boundary: ${item.svgRight.toFixed(1)}px`);
      console.log(`  Viewport boundary: ${item.viewportWidth}px`);
      console.log(`  In viewport: ${item.isInViewport} (overflow: ${item.viewportOverflow.toFixed(1)}px)`);
      console.log(`  In SVG: ${item.isInSvg} (overflow: ${item.svgOverflow.toFixed(1)}px)`);
    });
    
    // Take a close-up of the legend area
    const firstChart = await page.$('svg');
    if (firstChart) {
      const box = await firstChart.boundingBox();
      if (box && box.x + box.width > 500) {
        await page.screenshot({
          path: 'tests/legend-800px-closeup.png',
          clip: {
            x: Math.max(0, box.x + box.width - 400),
            y: box.y,
            width: Math.min(400, 800 - (box.x + box.width - 400)),
            height: 200
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();