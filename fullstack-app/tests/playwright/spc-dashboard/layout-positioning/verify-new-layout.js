const { chromium } = require('playwright');

/**
 * Verify New Layout Test
 * Confirms that the repositioning meets all requirements
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Verifying New Layout Positioning ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const verificationResults = await page.evaluate(() => {
      const results = [];
      const containers = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      
      containers.forEach((container, index) => {
        const containerRect = container.getBoundingClientRect();
        
        // Find all layout elements
        const title = container.querySelector('h4');
        const titleContainer = container.querySelector('.px-4.pt-4.pb-4');
        const tabContainer = container.querySelector('.px-4.pb-4');
        const tabGroup = container.querySelector('.flex.border-b.border-gray-200');
        const zoomArea = container.querySelector('.px-4.pt-0.pb-2[style*="position: relative"]');
        const chartArea = container.querySelector('.p-4.pt-0');
        const svg = container.querySelector('svg');
        
        const measurements = {
          chartIndex: index,
          checks: {
            titlePresent: !!title,
            tabGroupPresent: !!tabGroup,
            zoomAreaPresent: !!zoomArea,
            svgPresent: !!svg
          },
          gaps: {}
        };
        
        // Calculate key gaps
        if (tabGroup && zoomArea) {
          const tabRect = tabGroup.getBoundingClientRect();
          const zoomRect = zoomArea.getBoundingClientRect();
          measurements.gaps.tabToZoom = zoomRect.top - tabRect.bottom;
          
          // Check horizontal alignment
          measurements.alignment = {
            tabGroupLeft: tabRect.left - containerRect.left,
            zoomAreaLeft: zoomRect.left - containerRect.left,
            isAligned: Math.abs(tabRect.left - zoomRect.left) < 1
          };
        }
        
        if (zoomArea && svg) {
          const zoomRect = zoomArea.getBoundingClientRect();
          const svgRect = svg.getBoundingClientRect();
          measurements.gaps.zoomToSvg = svgRect.top - zoomRect.bottom;
        }
        
        if (title && tabGroup) {
          const titleRect = title.getBoundingClientRect();
          const tabRect = tabGroup.getBoundingClientRect();
          measurements.gaps.titleToTab = tabRect.top - titleRect.bottom;
        }
        
        // Visual order check
        if (title && tabGroup && zoomArea && svg) {
          const titleTop = title.getBoundingClientRect().top;
          const tabTop = tabGroup.getBoundingClientRect().top;
          const zoomTop = zoomArea.getBoundingClientRect().top;
          const svgTop = svg.getBoundingClientRect().top;
          
          measurements.visualOrder = {
            correct: titleTop < tabTop && tabTop < zoomTop && zoomTop < svgTop,
            positions: {
              title: titleTop - containerRect.top,
              tabGroup: tabTop - containerRect.top,
              zoomArea: zoomTop - containerRect.top,
              svg: svgTop - containerRect.top
            }
          };
        }
        
        results.push(measurements);
      });
      
      return results;
    });
    
    // Display verification results
    console.log('📋 Layout Verification Results:\n');
    
    let allPassed = true;
    
    verificationResults.forEach(result => {
      console.log(`Chart ${result.chartIndex}:`);
      
      // Check 1: All elements present
      const elementsOk = Object.values(result.checks).every(v => v);
      console.log(`  ✓ All elements present: ${elementsOk ? '✅' : '❌'}`);
      if (!elementsOk) allPassed = false;
      
      // Check 2: Zoom to SVG gap is approximately 8px
      const zoomToSvgOk = Math.abs(result.gaps.zoomToSvg - 8) < 2;
      console.log(`  ✓ Zoom to SVG gap (~8px): ${result.gaps.zoomToSvg}px ${zoomToSvgOk ? '✅' : '❌'}`);
      if (!zoomToSvgOk) allPassed = false;
      
      // Check 3: Tab Group and Zoom Area alignment
      if (result.alignment) {
        console.log(`  ✓ Horizontal alignment: ${result.alignment.isAligned ? '✅' : '❌'}`);
        if (!result.alignment.isAligned) allPassed = false;
      }
      
      // Check 4: Visual order
      if (result.visualOrder) {
        console.log(`  ✓ Visual order (Title→Tab→Zoom→SVG): ${result.visualOrder.correct ? '✅' : '❌'}`);
        if (!result.visualOrder.correct) allPassed = false;
      }
      
      // Show gaps
      console.log(`  📏 Gaps:`);
      console.log(`     Title to Tab: ${result.gaps.titleToTab || 'N/A'}px`);
      console.log(`     Tab to Zoom: ${result.gaps.tabToZoom || 'N/A'}px`);
      console.log(`     Zoom to SVG: ${result.gaps.zoomToSvg || 'N/A'}px`);
      
      console.log('');
    });
    
    console.log('\n=== Overall Result ===');
    console.log(allPassed ? '✅ All layout requirements met!' : '❌ Some requirements not met');
    
    // Take a final screenshot
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/final-layout-verification.png',
      fullPage: false 
    });
    
    console.log('\nScreenshot saved: final-layout-verification.png');
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();