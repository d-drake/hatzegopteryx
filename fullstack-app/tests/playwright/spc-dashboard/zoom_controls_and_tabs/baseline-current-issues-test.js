const { chromium } = require('playwright');

/**
 * Baseline test to document current issues:
 * 1. Chart labels stacking on resize
 * 2. Chart title and zoom controls on same x-dimension
 * 3. Current zoom controls positioning
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Baseline Test: Documenting Current Issues ===\n');
    
    // Test 1: Label stacking on resize
    console.log('Test 1: Chart Label Stacking on Resize');
    const page1 = await browser.newPage();
    await page1.setViewportSize({ width: 1200, height: 800 });
    await page1.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page1.waitForSelector('svg', { timeout: 10000 });
    await page1.waitForTimeout(2000);
    
    // Count initial axis labels
    const initialLabelCount = await page1.evaluate(() => {
      const labels = document.querySelectorAll('.axis text');
      return labels.length;
    });
    
    console.log(`  Initial label count: ${initialLabelCount}`);
    
    // Resize multiple times
    const resizes = [800, 1000, 1200, 900];
    for (const width of resizes) {
      await page1.setViewportSize({ width, height: 800 });
      await page1.waitForTimeout(1000);
      
      const labelCount = await page1.evaluate(() => {
        const labels = document.querySelectorAll('.axis text');
        return labels.length;
      });
      
      console.log(`  After resize to ${width}px: ${labelCount} labels`);
    }
    
    // Check for overlapping labels
    const overlappingLabels = await page1.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.axis text'));
      const overlaps = [];
      
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const rect1 = labels[i].getBoundingClientRect();
          const rect2 = labels[j].getBoundingClientRect();
          
          if (rect1.left < rect2.right && rect1.right > rect2.left &&
              rect1.top < rect2.bottom && rect1.bottom > rect2.top) {
            overlaps.push({
              label1: labels[i].textContent,
              label2: labels[j].textContent
            });
          }
        }
      }
      
      return overlaps;
    });
    
    if (overlappingLabels.length > 0) {
      console.log(`  ❌ Found ${overlappingLabels.length} overlapping labels`);
    } else {
      console.log('  ✅ No overlapping labels detected');
    }
    
    await page1.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/baseline-label-stacking.png',
      fullPage: true 
    });
    
    await page1.close();
    
    // Test 2: Current layout analysis
    console.log('\nTest 2: Current Layout Analysis');
    const page2 = await browser.newPage();
    await page2.setViewportSize({ width: 1200, height: 800 });
    await page2.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page2.waitForSelector('svg', { timeout: 10000 });
    await page2.waitForTimeout(2000);
    
    const layoutAnalysis = await page2.evaluate(() => {
      const results = {
        chartContainers: [],
        zoomControls: [],
        titles: []
      };
      
      // Analyze each chart container
      const containers = document.querySelectorAll('.bg-white.p-4.rounded-lg.shadow');
      containers.forEach((container, index) => {
        const rect = container.getBoundingClientRect();
        const title = container.querySelector('h4');
        const zoomControls = container.querySelector('[class*="zoom-controls"], [class*="text-xs"], [class*="text-gray"]');
        const svg = container.querySelector('svg');
        
        results.chartContainers.push({
          index,
          height: rect.height,
          width: rect.width
        });
        
        if (title) {
          const titleRect = title.getBoundingClientRect();
          results.titles.push({
            index,
            text: title.textContent,
            top: titleRect.top - rect.top,
            height: titleRect.height
          });
        }
        
        if (zoomControls) {
          const zoomRect = zoomControls.getBoundingClientRect();
          results.zoomControls.push({
            index,
            top: zoomRect.top - rect.top,
            height: zoomRect.height,
            isOnSameLineAsTitle: title && Math.abs(titleRect.top - zoomRect.top) < 5
          });
        }
        
        if (svg) {
          const svgRect = svg.getBoundingClientRect();
          results.chartContainers[index].svgTop = svgRect.top - rect.top;
          results.chartContainers[index].svgHeight = svgRect.height;
        }
      });
      
      return results;
    });
    
    console.log('  Chart Layout Analysis:');
    layoutAnalysis.titles.forEach((title, i) => {
      const zoom = layoutAnalysis.zoomControls[i];
      console.log(`    Chart ${i}: "${title.text}"`);
      console.log(`      Title position: ${title.top}px from container top`);
      if (zoom) {
        console.log(`      Zoom controls position: ${zoom.top}px from container top`);
        console.log(`      Same line as title: ${zoom.isOnSameLineAsTitle ? 'YES ❌' : 'NO ✅'}`);
      }
    });
    
    // Test 3: Measure current zoom controls distance from axes
    const zoomToAxisDistance = await page2.evaluate(() => {
      const results = [];
      const containers = document.querySelectorAll('.bg-white.p-4.rounded-lg.shadow');
      
      containers.forEach((container, index) => {
        const svg = container.querySelector('svg');
        const zoomControls = container.querySelector('[class*="zoom-controls"], [class*="text-xs"], [class*="text-gray"]');
        
        if (svg && zoomControls) {
          const svgRect = svg.getBoundingClientRect();
          const zoomRect = zoomControls.getBoundingClientRect();
          
          // Find left axis
          const leftAxis = svg.querySelector('.axis:first-of-type');
          if (leftAxis) {
            const axisRect = leftAxis.getBoundingClientRect();
            const distance = svgRect.top - zoomRect.bottom;
            
            results.push({
              chartIndex: index,
              distanceToSvg: distance,
              zoomHeight: zoomRect.height,
              recommendation: distance > 20 ? 'Should be closer' : 'Good spacing'
            });
          }
        }
      });
      
      return results;
    });
    
    console.log('\nTest 3: Zoom Controls Distance from Chart:');
    zoomToAxisDistance.forEach(result => {
      console.log(`  Chart ${result.chartIndex}: ${result.distanceToSvg.toFixed(1)}px from SVG`);
      console.log(`    Recommendation: ${result.recommendation}`);
    });
    
    await page2.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/baseline-layout-analysis.png',
      fullPage: true 
    });
    
    await page2.close();
    
    // Save detailed results
    const fs = require('fs');
    const detailedResults = {
      timestamp: new Date().toISOString(),
      issues: {
        labelStacking: overlappingLabels.length > 0,
        titleZoomSameLine: layoutAnalysis.zoomControls.some(z => z.isOnSameLineAsTitle),
        zoomControlsDistance: zoomToAxisDistance.map(z => z.distanceToSvg)
      },
      layoutAnalysis,
      zoomToAxisDistance
    };
    
    fs.writeFileSync(
      '/home/dwdra/tmp/tests/playwright_md/baseline-current-issues.json',
      JSON.stringify(detailedResults, null, 2)
    );
    
    console.log('\n=== Summary ===');
    console.log('Issues documented:');
    console.log(`  1. Label stacking: ${detailedResults.issues.labelStacking ? 'YES ❌' : 'NO ✅'}`);
    console.log(`  2. Title/Zoom same line: ${detailedResults.issues.titleZoomSameLine ? 'YES ❌' : 'NO ✅'}`);
    console.log(`  3. Zoom distance: ${Math.max(...detailedResults.issues.zoomControlsDistance)}px (should be 5-10px)`);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();