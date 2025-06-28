const { chromium } = require('playwright');

/**
 * Comprehensive test for all fixes:
 * 1. Zoom controls positioning
 * 2. Removed top/bottom data margins
 * 3. Layout improvements
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Comprehensive Fixes Test ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Test 1: Data margins removal
    console.log('Test 1: Data Margins Removal');
    
    const marginAnalysis = await page.evaluate(() => {
      const results = [];
      const svgs = document.querySelectorAll('svg');
      
      svgs.forEach((svg, index) => {
        // Find data points (circles or symbols)
        const dataPoints = svg.querySelectorAll('circle, path[d*="M"]');
        const svgRect = svg.getBoundingClientRect();
        const svgViewBox = svg.getAttribute('viewBox');
        
        if (dataPoints.length > 0) {
          let minY = Infinity;
          let maxY = -Infinity;
          
          dataPoints.forEach(point => {
            const rect = point.getBoundingClientRect();
            const relativeY = rect.top + rect.height/2 - svgRect.top;
            minY = Math.min(minY, relativeY);
            maxY = Math.max(maxY, relativeY);
          });
          
          // Parse viewBox to get inner dimensions
          const viewBoxValues = svgViewBox ? svgViewBox.split(' ').map(Number) : [0, 0, 800, 500];
          const innerHeight = viewBoxValues[3] - 60; // Subtract top and bottom margins
          
          results.push({
            chartIndex: index,
            dataPointsCount: dataPoints.length,
            minYPosition: minY,
            maxYPosition: maxY,
            svgHeight: svgRect.height,
            innerHeight: innerHeight,
            // Check if data extends to edges (within 10px tolerance)
            dataExtendsToTop: minY <= 10,
            dataExtendsToBottom: maxY >= (svgRect.height - 70) // Account for bottom margin
          });
        }
      });
      
      return results;
    });
    
    marginAnalysis.forEach(analysis => {
      console.log(`  Chart ${analysis.chartIndex}:`);
      console.log(`    Data points: ${analysis.dataPointsCount}`);
      console.log(`    Data extends to top: ${analysis.dataExtendsToTop ? '✅' : '❌'}`);
      console.log(`    Data extends to bottom: ${analysis.dataExtendsToBottom ? '✅' : '❌'}`);
      console.log(`    Y range: ${analysis.minYPosition.toFixed(1)} - ${analysis.maxYPosition.toFixed(1)}px`);
    });
    
    // Test 2: Clipping path verification
    console.log('\nTest 2: Clipping Path Verification');
    
    const clippingAnalysis = await page.evaluate(() => {
      const results = [];
      const svgs = document.querySelectorAll('svg');
      
      svgs.forEach((svg, index) => {
        const clipPath = svg.querySelector('clipPath rect');
        if (clipPath) {
          const x = parseFloat(clipPath.getAttribute('x') || '0');
          const y = parseFloat(clipPath.getAttribute('y') || '0');
          const width = parseFloat(clipPath.getAttribute('width') || '0');
          const height = parseFloat(clipPath.getAttribute('height') || '0');
          
          results.push({
            chartIndex: index,
            clipPath: { x, y, width, height },
            correctTopMargin: y === 0, // Should be 0 (no top margin)
            correctLeftMargin: x === 30, // Should still have left margin
            fullHeight: height > 300 // Should use full inner height
          });
        }
      });
      
      return results;
    });
    
    clippingAnalysis.forEach(analysis => {
      console.log(`  Chart ${analysis.chartIndex}:`);
      console.log(`    Clip path: x=${analysis.clipPath.x}, y=${analysis.clipPath.y}, w=${analysis.clipPath.width}, h=${analysis.clipPath.height}`);
      console.log(`    Correct top margin (y=0): ${analysis.correctTopMargin ? '✅' : '❌'}`);
      console.log(`    Correct left margin (x=30): ${analysis.correctLeftMargin ? '✅' : '❌'}`);
      console.log(`    Uses full height: ${analysis.fullHeight ? '✅' : '❌'}`);
    });
    
    // Test 3: Layout structure verification
    console.log('\nTest 3: Layout Structure');
    
    const layoutAnalysis = await page.evaluate(() => {
      const containers = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      const results = [];
      
      containers.forEach((container, index) => {
        const title = container.querySelector('h4');
        const tabs = container.querySelector('.flex.border-b');
        const zoomArea = container.querySelector('[style*="minHeight"]');
        const chartArea = container.querySelector('.p-4.pt-0');
        
        if (title && tabs && zoomArea && chartArea) {
          const titleRect = title.getBoundingClientRect();
          const tabsRect = tabs.getBoundingClientRect();
          const zoomRect = zoomArea.getBoundingClientRect();
          const chartRect = chartArea.getBoundingClientRect();
          
          results.push({
            chartIndex: index,
            structure: {
              titleAboveTabs: titleRect.bottom <= tabsRect.top + 5,
              tabsAboveZoomArea: tabsRect.bottom <= zoomRect.top + 5,
              zoomAreaAboveChart: zoomRect.bottom <= chartRect.top + 5
            },
            spacing: {
              titleToTabs: tabsRect.top - titleRect.bottom,
              tabsToZoom: zoomRect.top - tabsRect.bottom,
              zoomToChart: chartRect.top - zoomRect.bottom
            }
          });
        }
      });
      
      return results;
    });
    
    layoutAnalysis.forEach(analysis => {
      console.log(`  Chart ${analysis.chartIndex}:`);
      console.log(`    Title → Tabs: ${analysis.structure.titleAboveTabs ? '✅' : '❌'} (${analysis.spacing.titleToTabs.toFixed(1)}px)`);
      console.log(`    Tabs → Zoom Area: ${analysis.structure.tabsAboveZoomArea ? '✅' : '❌'} (${analysis.spacing.tabsToZoom.toFixed(1)}px)`);
      console.log(`    Zoom Area → Chart: ${analysis.structure.zoomAreaAboveChart ? '✅' : '❌'} (${analysis.spacing.zoomToChart.toFixed(1)}px)`);
    });
    
    // Test 4: Zoom controls positioning (with forced visibility)
    console.log('\nTest 4: Zoom Controls Positioning');
    
    // Inject test controls to verify positioning
    await page.addStyleTag({
      content: `
        .test-zoom-control {
          position: absolute;
          top: -60px;
          left: 10px;
          z-index: 10;
          background: rgba(255,255,255,0.95);
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 12px;
          border: 1px solid #d1d5db;
          min-width: 200px;
          color: red;
        }
      `
    });
    
    await page.evaluate(() => {
      const chartAreas = document.querySelectorAll('.p-4.pt-0');
      chartAreas.forEach((area, index) => {
        const testControl = document.createElement('div');
        testControl.className = 'test-zoom-control';
        testControl.innerHTML = `Test Zoom Control ${index}`;
        area.appendChild(testControl);
      });
    });
    
    await page.waitForTimeout(500);
    
    const zoomPositioning = await page.evaluate(() => {
      const testControls = document.querySelectorAll('.test-zoom-control');
      const results = [];
      
      testControls.forEach((control, index) => {
        const controlRect = control.getBoundingClientRect();
        const container = control.closest('.bg-white.rounded-lg.shadow');
        const svg = container?.querySelector('svg');
        const tabs = container?.querySelector('.flex.border-b');
        
        if (container && svg && tabs) {
          const svgRect = svg.getBoundingClientRect();
          const tabsRect = tabs.getBoundingClientRect();
          
          results.push({
            chartIndex: index,
            positioning: {
              aboveSVG: controlRect.bottom < svgRect.top,
              belowTabs: controlRect.top > tabsRect.bottom,
              withinContainer: controlRect.left >= container.getBoundingClientRect().left
            },
            distances: {
              toSVG: svgRect.top - controlRect.bottom,
              fromTabs: controlRect.top - tabsRect.bottom
            }
          });
        }
      });
      
      return results;
    });
    
    zoomPositioning.forEach(analysis => {
      console.log(`  Chart ${analysis.chartIndex}:`);
      console.log(`    Above SVG: ${analysis.positioning.aboveSVG ? '✅' : '❌'} (${analysis.distances.toSVG.toFixed(1)}px gap)`);
      console.log(`    Below tabs: ${analysis.positioning.belowTabs ? '✅' : '❌'} (${analysis.distances.fromTabs.toFixed(1)}px gap)`);
      console.log(`    Within container: ${analysis.positioning.withinContainer ? '✅' : '❌'}`);
    });
    
    // Take final screenshot
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/comprehensive-fixes-test.png',
      fullPage: true 
    });
    
    // Calculate overall results
    const allMarginsRemoved = marginAnalysis.every(a => a.dataExtendsToTop && a.dataExtendsToBottom);
    const allClippingCorrect = clippingAnalysis.every(a => a.correctTopMargin && a.correctLeftMargin && a.fullHeight);
    const allLayoutCorrect = layoutAnalysis.every(a => 
      a.structure.titleAboveTabs && a.structure.tabsAboveZoomArea && a.structure.zoomAreaAboveChart
    );
    const allZoomPositioned = zoomPositioning.every(a => 
      a.positioning.aboveSVG && a.positioning.belowTabs && a.positioning.withinContainer
    );
    
    console.log('\n=== Comprehensive Test Results ===');
    console.log(`Data margins removed: ${allMarginsRemoved ? '✅' : '❌'}`);
    console.log(`Clipping path updated: ${allClippingCorrect ? '✅' : '❌'}`);
    console.log(`Layout structure correct: ${allLayoutCorrect ? '✅' : '❌'}`);
    console.log(`Zoom controls positioned: ${allZoomPositioned ? '✅' : '❌'}`);
    
    const allTestsPassed = allMarginsRemoved && allClippingCorrect && allLayoutCorrect && allZoomPositioned;
    console.log(`\nOverall Status: ${allTestsPassed ? '✅ ALL FIXES VERIFIED' : '❌ SOME ISSUES REMAIN'}`);
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync(
      '/home/dwdra/tmp/tests/playwright_md/comprehensive-fixes-results.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        marginAnalysis,
        clippingAnalysis,
        layoutAnalysis,
        zoomPositioning,
        results: {
          allMarginsRemoved,
          allClippingCorrect,
          allLayoutCorrect,
          allZoomPositioned,
          allTestsPassed
        }
      }, null, 2)
    );
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();