const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Overflow Fix Verification Test ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    
    // Test multiple viewport widths
    const viewportWidths = [1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400];
    
    for (const viewportWidth of viewportWidths) {
      await page.setViewportSize({ width: viewportWidth, height: 900 });
      await page.waitForTimeout(1000);
      
      const result = await page.evaluate(() => {
        const container = document.querySelector('.bg-white.rounded-lg.shadow');
        const flexContainer = container?.querySelector('.flex.gap-\\[5px\\]');
        
        if (!flexContainer) return { mode: 'tabbed' };
        
        const timelineChart = flexContainer.children[0];
        const varChart = flexContainer.children[1];
        const timelineSvg = timelineChart?.querySelector('svg');
        const varSvg = varChart?.querySelector('svg');
        
        return {
          mode: 'side-by-side',
          container: {
            width: container.getBoundingClientRect().width
          },
          timeline: {
            containerWidth: timelineChart?.getBoundingClientRect().width,
            svgWidth: timelineSvg?.getAttribute('width'),
            svgActualWidth: timelineSvg?.getBoundingClientRect().width,
            hasOverflow: timelineChart ? timelineChart.scrollWidth > timelineChart.clientWidth : false
          },
          variability: {
            containerWidth: varChart?.getBoundingClientRect().width,
            svgWidth: varSvg?.getAttribute('width'),
            svgActualWidth: varSvg?.getBoundingClientRect().width,
            hasOverflow: varChart ? varChart.scrollWidth > varChart.clientWidth : false
          }
        };
      });
      
      console.log(`Viewport: ${viewportWidth}px`);
      console.log(`Mode: ${result.mode}`);
      
      if (result.mode === 'side-by-side') {
        console.log(`Container: ${result.container.width}px`);
        console.log(`Timeline: Container=${result.timeline.containerWidth}px, SVG=${result.timeline.svgWidth}px, Overflow=${result.timeline.hasOverflow ? '❌' : '✓'}`);
        console.log(`Variability: Container=${result.variability.containerWidth}px, SVG=${result.variability.svgWidth}px, Overflow=${result.variability.hasOverflow ? '❌' : '✓'}`);
        
        // Check if combined width fits
        const totalWidth = parseFloat(result.timeline.containerWidth) + parseFloat(result.variability.containerWidth) + 5; // 5px gap
        const fits = totalWidth <= result.container.width;
        console.log(`Total width: ${totalWidth.toFixed(1)}px, Fits: ${fits ? '✓' : '❌'}`);
      }
      
      console.log('---');
    }
    
    console.log('\n✅ Overflow fix test completed');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();