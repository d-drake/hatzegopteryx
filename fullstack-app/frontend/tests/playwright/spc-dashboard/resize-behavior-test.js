const { chromium } = require('playwright');

/**
 * Test resize behavior of responsive charts
 * Ensures charts adapt when window is resized
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Chart Resize Behavior Test ===\n');
    
    // Start with a medium viewport
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Test resize sequence
    const resizeSequence = [
      { width: 1024, description: 'Initial (desktop)' },
      { width: 768, description: 'Tablet' },
      { width: 500, description: 'Large phone' },
      { width: 375, description: 'Phone' },
      { width: 768, description: 'Back to tablet' },
      { width: 1280, description: 'Large desktop' }
    ];
    
    for (const resize of resizeSequence) {
      console.log(`\nResizing to ${resize.width}px (${resize.description}):`);
      
      // Resize viewport
      await page.setViewportSize({ width: resize.width, height: 800 });
      await page.waitForTimeout(500); // Wait for resize debounce
      
      // Check chart dimensions
      const dimensions = await page.evaluate(() => {
        const results = [];
        const containers = document.querySelectorAll('div.bg-white.p-4.rounded-lg.shadow');
        
        containers.forEach((container, index) => {
          const svg = container.querySelector('svg');
          if (svg) {
            const containerWidth = container.clientWidth;
            const svgWidth = parseFloat(svg.getAttribute('width') || '0');
            const hasScroll = container.scrollWidth > container.clientWidth;
            
            results.push({
              index,
              containerWidth,
              svgWidth,
              hasScroll,
              margin: containerWidth - 32 - svgWidth // 32px total padding
            });
          }
        });
        
        return results;
      });
      
      // Display results
      dimensions.forEach(dim => {
        const status = !dim.hasScroll && dim.margin >= 0 ? '✅' : '❌';
        console.log(`  ${status} Chart ${dim.index}: SVG ${dim.svgWidth}px in ${dim.containerWidth}px container (margin: ${dim.margin}px)`);
      });
      
      // Take screenshot
      await page.screenshot({
        path: `/home/dwdra/tmp/tests/playwright_png/resize-${resize.width}px.png`
      });
    }
    
    // Test rapid resize
    console.log('\n\nTesting rapid resize (debounce behavior):');
    const rapidSizes = [400, 500, 600, 700, 800];
    
    for (const size of rapidSizes) {
      await page.setViewportSize({ width: size, height: 800 });
      // Don't wait between resizes
    }
    
    // Wait for debounce to settle
    await page.waitForTimeout(1000);
    
    // Check final state
    const finalCheck = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      const container = svg?.closest('.bg-white.p-4.rounded-lg.shadow');
      
      if (svg && container) {
        return {
          finalViewport: window.innerWidth,
          svgWidth: parseFloat(svg.getAttribute('width') || '0'),
          containerWidth: container.clientWidth,
          hasScroll: container.scrollWidth > container.clientWidth
        };
      }
      return null;
    });
    
    if (finalCheck) {
      console.log(`\nFinal state after rapid resize:`);
      console.log(`  Viewport: ${finalCheck.finalViewport}px`);
      console.log(`  SVG: ${finalCheck.svgWidth}px`);
      console.log(`  Container: ${finalCheck.containerWidth}px`);
      console.log(`  Has scroll: ${finalCheck.hasScroll}`);
    }
    
    console.log('\n✅ Resize behavior test complete');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();