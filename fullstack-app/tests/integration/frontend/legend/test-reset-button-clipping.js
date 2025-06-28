const { chromium } = require('playwright');

/**
 * Test Reset Selections Button Clipping
 * Checks for clipping issues with the Reset button in legends
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Testing Reset Selections Button Clipping ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // First, let's find and analyze legend items
    console.log('1. Analyzing legend structure...');
    const legendAnalysis = await page.evaluate(() => {
      const results = [];
      const charts = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      
      charts.forEach((chart, chartIndex) => {
        const svg = chart.querySelector('svg');
        if (!svg) return;
        
        // Find legend groups
        const legendGroups = svg.querySelectorAll('g[transform*="translate"]');
        const legends = [];
        
        legendGroups.forEach(group => {
          // Check if this is a legend (has clickable rects and text)
          const clickableRects = group.querySelectorAll('rect[style*="cursor: pointer"]');
          const texts = group.querySelectorAll('text');
          
          if (clickableRects.length > 0 && texts.length > 0) {
            const groupRect = group.getBoundingClientRect();
            legends.push({
              hasClickableItems: true,
              itemCount: clickableRects.length,
              position: {
                top: groupRect.top,
                right: groupRect.right,
                width: groupRect.width,
                height: groupRect.height
              }
            });
          }
        });
        
        // Check for reset button
        const resetButton = svg.querySelector('g[style*="cursor: pointer"] rect[fill="#f9fafb"]');
        let resetButtonInfo = null;
        if (resetButton) {
          const buttonG = resetButton.parentElement;
          const buttonRect = buttonG.getBoundingClientRect();
          const svgRect = svg.getBoundingClientRect();
          resetButtonInfo = {
            found: true,
            position: {
              top: buttonRect.top - svgRect.top,
              right: svgRect.right - buttonRect.right,
              width: buttonRect.width,
              height: buttonRect.height
            },
            relativeToSvg: {
              exceedsRight: buttonRect.right > svgRect.right,
              exceedsTop: buttonRect.top < svgRect.top,
              exceedsBottom: buttonRect.bottom > svgRect.bottom
            }
          };
        }
        
        results.push({
          chartIndex,
          legends,
          resetButton: resetButtonInfo,
          svgDimensions: {
            width: svg.getAttribute('width'),
            height: svg.getAttribute('height')
          }
        });
      });
      
      return results;
    });
    
    console.log('Legend analysis:', JSON.stringify(legendAnalysis, null, 2));
    
    // Now trigger legend selection to make reset button appear
    console.log('\n2. Clicking legend items to trigger reset button...');
    
    // Click on a legend item in the first chart
    const clicked = await page.evaluate(() => {
      const firstChart = document.querySelector('.bg-white.rounded-lg.shadow');
      if (!firstChart) return false;
      
      // Find a clickable legend item
      const clickableRect = firstChart.querySelector('rect[style*="cursor: pointer"]');
      if (clickableRect) {
        clickableRect.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return true;
      }
      return false;
    });
    
    if (clicked) {
      await page.waitForTimeout(500);
      
      // Check reset button after selection
      console.log('\n3. Analyzing reset button after selection...');
      const resetButtonAnalysis = await page.evaluate(() => {
        const results = [];
        
        document.querySelectorAll('svg').forEach((svg, index) => {
          const svgRect = svg.getBoundingClientRect();
          const resetG = svg.querySelector('g[transform*="translate"][style*="cursor: pointer"]');
          
          if (resetG) {
            // Look for the reset button group
            const resetRect = resetG.querySelector('rect[fill="#f9fafb"]');
            const resetText = resetG.querySelector('text');
            
            if (resetRect && resetText) {
              const gRect = resetG.getBoundingClientRect();
              const textContent = resetText.textContent;
              
              // Check if text is clipped
              const textBBox = resetText.getBBox ? resetText.getBBox() : null;
              
              results.push({
                svgIndex: index,
                found: true,
                text: textContent,
                transform: resetG.getAttribute('transform'),
                position: {
                  top: gRect.top - svgRect.top,
                  left: gRect.left - svgRect.left,
                  right: svgRect.right - gRect.right,
                  width: gRect.width,
                  height: gRect.height
                },
                clipping: {
                  exceedsRight: gRect.right > svgRect.right,
                  exceedsLeft: gRect.left < svgRect.left,
                  exceedsTop: gRect.top < svgRect.top,
                  exceedsBottom: gRect.bottom > svgRect.bottom,
                  rightOverflow: gRect.right > svgRect.right ? gRect.right - svgRect.right : 0
                },
                svgBounds: {
                  width: svgRect.width,
                  height: svgRect.height
                },
                textBBox: textBBox
              });
            }
          }
        });
        
        return results;
      });
      
      console.log('\nReset button analysis:', JSON.stringify(resetButtonAnalysis, null, 2));
      
      // Take screenshot
      await page.screenshot({ 
        path: '/home/dwdra/tmp/tests/playwright_png/reset-button-clipping.png',
        fullPage: false 
      });
      
      // Summary
      console.log('\n=== Summary ===');
      resetButtonAnalysis.forEach(button => {
        if (button.found) {
          console.log(`\nChart ${button.svgIndex}:`);
          console.log(`  Reset button text: "${button.text}"`);
          console.log(`  Position from right edge: ${button.position.right}px`);
          console.log(`  Clipping detected: ${button.clipping.exceedsRight ? 'YES' : 'NO'}`);
          if (button.clipping.exceedsRight) {
            console.log(`  ❌ Overflow amount: ${button.clipping.rightOverflow}px`);
          }
        }
      });
    } else {
      console.log('Could not click legend item to trigger reset button');
    }
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();