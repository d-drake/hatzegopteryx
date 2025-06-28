const { chromium } = require('playwright');

/**
 * Test to verify that chart labels don't stack on resize
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Label Redraw Test: Verify No Stacking on Resize ===\n');
    
    const page = await browser.newPage();
    const viewportWidths = [1200, 800, 1000, 1200, 900, 1400, 600];
    let allTestsPassed = true;
    
    // Initial load
    await page.setViewportSize({ width: viewportWidths[0], height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Get initial label count
    const initialLabelCount = await page.evaluate(() => {
      const labels = document.querySelectorAll('.axis text');
      return labels.length;
    });
    
    console.log(`Initial label count: ${initialLabelCount}`);
    console.log('\nTesting resize sequence:');
    
    // Track label counts across resizes
    const labelCounts = [initialLabelCount];
    
    for (let i = 1; i < viewportWidths.length; i++) {
      const width = viewportWidths[i];
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(1500); // Wait for resize and redraw
      
      const labelCount = await page.evaluate(() => {
        const labels = document.querySelectorAll('.axis text');
        return labels.length;
      });
      
      labelCounts.push(labelCount);
      
      // Check if label count is reasonable (shouldn't increase dramatically)
      const maxExpectedLabels = initialLabelCount + 10; // Allow small variation
      const labelCountOk = labelCount <= maxExpectedLabels;
      
      console.log(`  ${width}px: ${labelCount} labels ${labelCountOk ? '✅' : '❌'}`);
      
      if (!labelCountOk) {
        allTestsPassed = false;
      }
    }
    
    // Check for overlapping labels after all resizes
    const overlappingLabels = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.axis text'));
      const overlaps = [];
      const threshold = 2; // pixels of allowed overlap
      
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const rect1 = labels[i].getBoundingClientRect();
          const rect2 = labels[j].getBoundingClientRect();
          
          // Check for significant overlap
          if (rect1.left < rect2.right - threshold && 
              rect1.right > rect2.left + threshold &&
              rect1.top < rect2.bottom - threshold && 
              rect1.bottom > rect2.top + threshold) {
            overlaps.push({
              label1: labels[i].textContent,
              label2: labels[j].textContent,
              overlap: {
                horizontal: Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left),
                vertical: Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top)
              }
            });
          }
        }
      }
      
      return overlaps;
    });
    
    console.log('\nOverlap Analysis:');
    if (overlappingLabels.length === 0) {
      console.log('  ✅ No overlapping labels detected');
    } else {
      console.log(`  ❌ Found ${overlappingLabels.length} overlapping labels`);
      overlappingLabels.slice(0, 5).forEach(overlap => {
        console.log(`    "${overlap.label1}" overlaps "${overlap.label2}"`);
      });
      allTestsPassed = false;
    }
    
    // Check label visibility
    const labelVisibility = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.axis text'));
      let visible = 0;
      let hidden = 0;
      
      labels.forEach(label => {
        const rect = label.getBoundingClientRect();
        const style = window.getComputedStyle(label);
        
        if (style.opacity === '0' || style.display === 'none' || 
            rect.width === 0 || rect.height === 0) {
          hidden++;
        } else {
          visible++;
        }
      });
      
      return { visible, hidden, total: labels.length };
    });
    
    console.log('\nLabel Visibility:');
    console.log(`  Visible: ${labelVisibility.visible}`);
    console.log(`  Hidden: ${labelVisibility.hidden}`);
    console.log(`  Total: ${labelVisibility.total}`);
    
    // Take screenshot of final state
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/label-redraw-final-state.png',
      fullPage: true 
    });
    
    // Analyze label count stability
    const labelCountVariation = Math.max(...labelCounts) - Math.min(...labelCounts);
    console.log('\nLabel Count Analysis:');
    console.log(`  Min count: ${Math.min(...labelCounts)}`);
    console.log(`  Max count: ${Math.max(...labelCounts)}`);
    console.log(`  Variation: ${labelCountVariation}`);
    
    if (labelCountVariation > 10) {
      console.log('  ❌ High variation indicates label stacking issue');
      allTestsPassed = false;
    } else {
      console.log('  ✅ Label count is stable across resizes');
    }
    
    // Save detailed results
    const fs = require('fs');
    const results = {
      timestamp: new Date().toISOString(),
      testPassed: allTestsPassed,
      labelCounts: viewportWidths.map((width, i) => ({
        width,
        count: labelCounts[i]
      })),
      overlappingLabels: overlappingLabels.length,
      labelVisibility,
      labelCountVariation
    };
    
    fs.writeFileSync(
      '/home/dwdra/tmp/tests/playwright_md/label-redraw-test-results.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n=== Test Summary ===');
    console.log(allTestsPassed ? '✅ All tests passed!' : '❌ Some tests failed');
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();