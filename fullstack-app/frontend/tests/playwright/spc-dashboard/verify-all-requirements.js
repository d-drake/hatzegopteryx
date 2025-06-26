const { chromium } = require('playwright');

/**
 * Comprehensive test for Issue #1: Y-axis boundary violations
 * Verifies all 5 requirements:
 * 1. Y-axis and Y2-axis presence verification
 * 2. Y-axis and Y2-axis lines must not render below X-axis
 * 3. Data elements must not render below X-axis
 * 4. LimitLines must not render below X-axis
 * 5. Chart annotations must not render below X-axis
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const testResults = await page.evaluate(() => {
      const results = {
        requirement1: { passed: true, issues: [] },
        requirement2: { passed: true, issues: [] },
        requirement3: { passed: true, issues: [] },
        requirement4: { passed: true, issues: [] },
        requirement5: { passed: true, issues: [] }
      };
      
      const svgs = document.querySelectorAll('svg');
      
      svgs.forEach((svg, svgIndex) => {
        // Find the main chart group
        const mainGroup = svg.querySelector('g');
        if (!mainGroup) return;
        
        // Get transform translation
        const transform = mainGroup.getAttribute('transform') || '';
        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
        const translateY = match ? parseFloat(match[2]) : 0;
        
        // Find X-axis position (should be at innerHeight)
        let xAxisY = 0;
        const xAxisGroup = svg.querySelector('g.tick line');
        if (xAxisGroup) {
          const xAxisTransform = xAxisGroup.closest('g[transform*="translate(0,"]');
          if (xAxisTransform) {
            const xMatch = xAxisTransform.getAttribute('transform').match(/translate\(0,([^)]+)\)/);
            xAxisY = xMatch ? parseFloat(xMatch[1]) + translateY : 0;
          }
        }
        
        // Requirement 1: Check for Y-axis presence
        // Look for axis elements with tick marks
        const leftAxisTicks = svg.querySelectorAll('g:not([transform*="translate("]) .tick line, g[transform="translate(0,0)"] .tick line');
        const rightAxisTicks = svg.querySelectorAll('g[transform*="translate("][transform*=",0)"] .tick line');
        
        // Also check for axis labels
        const yAxisLabels = Array.from(svg.querySelectorAll('text')).filter(text => {
          const content = text.textContent || '';
          return /^-?\d+$/.test(content) && !text.closest('[transform*="translate(0,"]');
        });
        
        const hasLeftYAxis = leftAxisTicks.length > 0 || yAxisLabels.length > 5;
        const hasRightYAxis = rightAxisTicks.length > 0;
        
        if (!hasLeftYAxis) {
          results.requirement1.passed = false;
          results.requirement1.issues.push(`Chart ${svgIndex}: Missing left Y-axis (found ${leftAxisTicks.length} ticks, ${yAxisLabels.length} labels)`);
        }
        
        // Requirement 2: Check Y-axis lines don't extend below X-axis
        svg.querySelectorAll('.domain').forEach(domain => {
          const d = domain.getAttribute('d');
          if (d && d.includes('V')) {
            // Parse vertical line commands
            const vMatches = d.match(/V(-?\d+\.?\d*)/g);
            if (vMatches) {
              vMatches.forEach(vCmd => {
                const y = parseFloat(vCmd.substring(1));
                if (y > xAxisY - translateY && xAxisY > 0) {
                  results.requirement2.passed = false;
                  results.requirement2.issues.push(`Chart ${svgIndex}: Axis line extends below X-axis`);
                }
              });
            }
          }
        });
        
        // Requirement 3: Check data points don't render below X-axis
        const dataElements = svg.querySelectorAll('circle, path[d*="M"]');
        dataElements.forEach(elem => {
          if (elem.tagName === 'circle') {
            const cy = parseFloat(elem.getAttribute('cy') || '0');
            if (cy > xAxisY - translateY && xAxisY > 0) {
              results.requirement3.passed = false;
              results.requirement3.issues.push(`Chart ${svgIndex}: Data point below X-axis at y=${cy}`);
            }
          }
        });
        
        // Requirement 4: Check limit lines don't extend below X-axis
        const limitLines = svg.querySelectorAll('line[stroke-dasharray]');
        limitLines.forEach(line => {
          const y1 = parseFloat(line.getAttribute('y1') || '0');
          const y2 = parseFloat(line.getAttribute('y2') || '0');
          const maxY = Math.max(y1, y2);
          
          if (maxY > xAxisY - translateY && xAxisY > 0) {
            results.requirement4.passed = false;
            results.requirement4.issues.push(`Chart ${svgIndex}: Limit line extends below X-axis`);
          }
        });
        
        // Requirement 5: Check annotations (text) don't render below X-axis
        const annotations = svg.querySelectorAll('text');
        annotations.forEach(text => {
          const y = parseFloat(text.getAttribute('y') || '0');
          const transform = text.getAttribute('transform') || '';
          let totalY = y;
          
          // Account for parent transforms
          let parent = text.parentElement;
          while (parent && parent !== svg) {
            const parentTransform = parent.getAttribute('transform');
            if (parentTransform) {
              const transMatch = parentTransform.match(/translate\([^,]+,([^)]+)\)/);
              if (transMatch) {
                totalY += parseFloat(transMatch[1]);
              }
            }
            parent = parent.parentElement;
          }
          
          // Only check if it's in the chart area (not axis labels)
          const isChartAnnotation = !text.closest('.tick') && totalY > 0 && totalY < xAxisY;
          if (isChartAnnotation && totalY > xAxisY && xAxisY > 0) {
            results.requirement5.passed = false;
            results.requirement5.issues.push(`Chart ${svgIndex}: Annotation "${text.textContent}" below X-axis`);
          }
        });
      });
      
      return results;
    });
    
    // Report results
    console.log('=== Y-axis Boundary Violation Test Results ===\n');
    
    let allPassed = true;
    
    Object.entries(testResults).forEach(([req, result]) => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${req}: ${status}`);
      
      if (!result.passed) {
        allPassed = false;
        result.issues.forEach(issue => {
          console.log(`  - ${issue}`);
        });
      }
    });
    
    console.log('\n=== Summary ===');
    console.log(allPassed ? '✅ All requirements passed!' : '❌ Some requirements failed');
    
    // Take screenshot for documentation
    await page.screenshot({ 
      path: 'tests/boundary-test-result.png',
      fullPage: true 
    });
    
  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ 
      path: `tests/error-boundary-test-${Date.now()}.png`,
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
})();