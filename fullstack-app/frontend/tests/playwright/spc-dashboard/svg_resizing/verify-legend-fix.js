const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Take a full screenshot
    await page.screenshot({ 
      path: 'tests/legend-after-fix.png',
      fullPage: true 
    });
    
    // Take close-up of first chart's legend area
    const firstChart = await page.$('svg');
    if (firstChart) {
      const box = await firstChart.boundingBox();
      if (box) {
        await page.screenshot({
          path: 'tests/legend-closeup-after-fix.png',
          clip: {
            x: box.x + box.width - 350,
            y: box.y,
            width: 350,
            height: 200
          }
        });
      }
    }
    
    // Check if legend text is fully visible
    const legendCheck = await page.evaluate(() => {
      const results = [];
      
      document.querySelectorAll('text').forEach(text => {
        const content = text.textContent || '';
        if (content === 'fake property1' || content.includes('FP1_')) {
          const rect = text.getBoundingClientRect();
          const svg = text.closest('svg');
          const svgRect = svg ? svg.getBoundingClientRect() : null;
          
          results.push({
            text: content,
            textRight: rect.right,
            svgRight: svgRect ? svgRect.right : 0,
            isVisible: svgRect ? rect.right <= svgRect.right : false,
            overflow: svgRect ? Math.max(0, rect.right - svgRect.right) : 0
          });
        }
      });
      
      return results;
    });
    
    console.log('Legend visibility check:');
    legendCheck.forEach(item => {
      if (item.text.includes('fake property1')) {
        console.log(`\n"${item.text}":`);
        console.log(`  Text ends at: ${item.textRight}px`);
        console.log(`  SVG ends at: ${item.svgRight}px`);
        console.log(`  Fully visible: ${item.isVisible}`);
        console.log(`  Overflow: ${item.overflow}px`);
      }
    });
    
    // Summary
    const anyOverflow = legendCheck.some(item => item.overflow > 0);
    console.log(`\n✅ Legend fix ${anyOverflow ? 'FAILED' : 'SUCCESSFUL'} - All legend items are ${anyOverflow ? 'NOT' : ''} fully visible`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();