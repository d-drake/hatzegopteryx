const { chromium } = require('playwright');

/**
 * Visual verification test for chart rendering issues
 * Uses headless mode for CI/automation
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('=== Visual Verification Test ===\n');
    
    // 1. Check Y-axes are present
    const axesCheck = await page.evaluate(() => {
      const results = [];
      const svgs = document.querySelectorAll('svg');
      
      svgs.forEach((svg, index) => {
        // Count axis tick labels
        const tickLabels = svg.querySelectorAll('.tick text');
        const numericLabels = Array.from(tickLabels).filter(text => {
          return /^[−\-]?\d/.test(text.textContent || '');
        });
        
        // Check for axis lines
        const axisLines = svg.querySelectorAll('.domain');
        
        results.push({
          chartIndex: index,
          tickLabelCount: tickLabels.length,
          numericLabelCount: numericLabels.length,
          axisLineCount: axisLines.length,
          hasAxes: tickLabels.length > 10 && axisLines.length >= 2
        });
      });
      
      return results;
    });
    
    console.log('1. Y-axis presence check:');
    axesCheck.forEach(result => {
      const status = result.hasAxes ? '✅' : '❌';
      console.log(`   ${status} Chart ${result.chartIndex}: ${result.tickLabelCount} tick labels, ${result.axisLineCount} axis lines`);
    });
    
    // 2. Check for limit lines below X-axis
    const limitLineCheck = await page.evaluate(() => {
      const issues = [];
      const svgs = document.querySelectorAll('svg');
      
      svgs.forEach((svg, index) => {
        // Find dashed lines (limit lines)
        const dashedLines = svg.querySelectorAll('line[stroke-dasharray]');
        
        // Get chart height from transform
        const mainG = svg.querySelector('g');
        const transform = mainG ? mainG.getAttribute('transform') : '';
        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
        const marginTop = match ? parseFloat(match[2]) : 0;
        
        // Approximate chart height (look for highest Y value in ticks)
        let chartHeight = 280; // default
        const yTicks = svg.querySelectorAll('g[transform^="translate(0,"] text');
        yTicks.forEach(tick => {
          const parent = tick.parentElement;
          if (parent) {
            const trans = parent.getAttribute('transform');
            const yMatch = trans ? trans.match(/translate\(0,([^)]+)\)/) : null;
            if (yMatch) {
              chartHeight = Math.max(chartHeight, parseFloat(yMatch[1]));
            }
          }
        });
        
        dashedLines.forEach((line, lineIndex) => {
          const y1 = parseFloat(line.getAttribute('y1') || '0');
          const y2 = parseFloat(line.getAttribute('y2') || '0');
          const stroke = line.getAttribute('stroke');
          
          if (y1 > chartHeight || y2 > chartHeight) {
            issues.push({
              chartIndex: index,
              lineIndex: lineIndex,
              y1, y2,
              chartHeight,
              color: stroke
            });
          }
        });
      });
      
      return issues;
    });
    
    console.log('\n2. Limit lines boundary check:');
    if (limitLineCheck.length === 0) {
      console.log('   ✅ No limit lines extending below X-axis');
    } else {
      limitLineCheck.forEach(issue => {
        console.log(`   ❌ Chart ${issue.chartIndex}: ${issue.color} line extends to y=${Math.max(issue.y1, issue.y2)} (chart height: ${issue.chartHeight})`);
      });
    }
    
    // 3. Check legend visibility
    const legendCheck = await page.evaluate(() => {
      const results = [];
      const viewportWidth = window.innerWidth;
      
      // Look for specific legend texts
      const legendTexts = ['bias', 'fake property1', 'bias x y', 'entity'];
      
      legendTexts.forEach(searchText => {
        const textElements = Array.from(document.querySelectorAll('text')).filter(text => 
          text.textContent === searchText
        );
        
        textElements.forEach(text => {
          const rect = text.getBoundingClientRect();
          results.push({
            text: searchText,
            visible: rect.width > 0 && rect.right <= viewportWidth,
            right: rect.right,
            viewportWidth: viewportWidth,
            overflow: Math.max(0, rect.right - viewportWidth)
          });
        });
      });
      
      return results;
    });
    
    console.log('\n3. Legend visibility check:');
    legendCheck.forEach(result => {
      const status = result.visible ? '✅' : '❌';
      console.log(`   ${status} "${result.text}": ${result.visible ? 'fully visible' : `cut off by ${result.overflow}px`}`);
    });
    
    // Take screenshots
    await page.screenshot({ 
      path: 'tests/visual-test-full.png',
      fullPage: true 
    });
    
    // Take close-up of first chart
    const firstChart = await page.$('.bg-white.p-4.rounded-lg.shadow');
    if (firstChart) {
      await firstChart.screenshot({
        path: 'tests/visual-test-chart1.png'
      });
    }
    
    console.log('\n✅ Visual verification complete. Screenshots saved.');
    
  } catch (error) {
    console.error('❌ Test error:', error);
    await page.screenshot({ 
      path: `tests/error-visual-${Date.now()}.png`,
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
})();