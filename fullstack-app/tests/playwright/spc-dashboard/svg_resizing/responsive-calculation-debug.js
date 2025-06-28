const { chromium } = require('playwright');

/**
 * Debug test to understand responsive width calculation
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Responsive Width Calculation Debug ===\n');
    
    // Test at 500px to understand the calculation
    await page.setViewportSize({ width: 500, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Inject debug logging
    const calculation = await page.evaluate(() => {
      const container = document.querySelector('div.bg-white.p-4.rounded-lg.shadow');
      const svg = container?.querySelector('svg');
      
      if (!container || !svg) return null;
      
      // Get all measurements
      const containerRect = container.getBoundingClientRect();
      const containerStyle = window.getComputedStyle(container);
      const bodyStyle = window.getComputedStyle(document.body);
      const mainElement = document.querySelector('main');
      const mainStyle = mainElement ? window.getComputedStyle(mainElement) : null;
      
      return {
        viewport: window.innerWidth,
        body: {
          clientWidth: document.body.clientWidth,
          margin: bodyStyle.margin,
          padding: bodyStyle.padding
        },
        main: mainElement ? {
          clientWidth: mainElement.clientWidth,
          boundingWidth: mainElement.getBoundingClientRect().width,
          maxWidth: mainStyle.maxWidth,
          margin: mainStyle.margin,
          padding: mainStyle.padding
        } : null,
        container: {
          clientWidth: container.clientWidth,
          boundingWidth: containerRect.width,
          paddingLeft: containerStyle.paddingLeft,
          paddingRight: containerStyle.paddingRight,
          paddingTotal: parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight),
          margin: containerStyle.margin
        },
        svg: {
          width: svg.getAttribute('width'),
          actualWidth: svg.getBoundingClientRect().width
        },
        calculation: {
          availableWidth: containerRect.width - (parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight)),
          expectedSvgWidth: Math.min(800, containerRect.width - 32)
        }
      };
    });
    
    console.log('Width Calculation Breakdown:');
    console.log(`\nViewport: ${calculation.viewport}px`);
    
    console.log('\nBody:');
    console.log(`  Client width: ${calculation.body.clientWidth}px`);
    console.log(`  Margin: ${calculation.body.margin}`);
    console.log(`  Padding: ${calculation.body.padding}`);
    
    if (calculation.main) {
      console.log('\nMain container:');
      console.log(`  Client width: ${calculation.main.clientWidth}px`);
      console.log(`  Bounding width: ${calculation.main.boundingWidth}px`);
      console.log(`  Max-width: ${calculation.main.maxWidth}`);
      console.log(`  Margin: ${calculation.main.margin}`);
      console.log(`  Padding: ${calculation.main.padding}`);
    }
    
    console.log('\nChart container:');
    console.log(`  Client width: ${calculation.container.clientWidth}px`);
    console.log(`  Bounding width: ${calculation.container.boundingWidth}px`);
    console.log(`  Padding: ${calculation.container.paddingLeft} + ${calculation.container.paddingRight} = ${calculation.container.paddingTotal}px`);
    console.log(`  Available for chart: ${calculation.calculation.availableWidth}px`);
    
    console.log('\nSVG:');
    console.log(`  Width attribute: ${calculation.svg.width}px`);
    console.log(`  Actual width: ${calculation.svg.actualWidth}px`);
    
    console.log('\nExpected calculation:');
    console.log(`  Container width (${calculation.container.boundingWidth}) - padding (32) = ${calculation.container.boundingWidth - 32}px`);
    console.log(`  Min(800, ${calculation.container.boundingWidth - 32}) = ${Math.min(800, calculation.container.boundingWidth - 32)}px`);
    
    // Check if there's additional margin being applied
    const difference = calculation.calculation.availableWidth - parseFloat(calculation.svg.width);
    console.log(`\nDifference between available and SVG: ${difference}px`);
    
    if (difference === 32) {
      console.log('  ℹ️  Hook is applying an additional 32px padding (total 64px reduction)');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();