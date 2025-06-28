const { chromium } = require('playwright');

/**
 * Test chart readability at various responsive sizes
 * Ensures text, data points, and axes remain visible
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Critical viewport sizes to test
  const viewports = [320, 375, 414, 500, 600, 768];
  const readabilityReport = [];
  
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: viewport, height: 800 });
      
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForSelector('svg', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Analyze readability metrics
      const metrics = await page.evaluate(() => {
        const svg = document.querySelector('svg');
        if (!svg) return null;
        
        // Count visible elements
        const textElements = svg.querySelectorAll('text');
        const dataPoints = svg.querySelectorAll('circle, path[d*="M"]');
        const axisLines = svg.querySelectorAll('.tick line');
        
        // Analyze text sizes
        const textSizes = Array.from(textElements).map(text => {
          const fontSize = window.getComputedStyle(text).fontSize;
          return parseFloat(fontSize);
        });
        
        // Check for overlapping text
        const overlappingText = [];
        const textRects = Array.from(textElements).map(text => ({
          element: text,
          rect: text.getBoundingClientRect(),
          content: text.textContent
        }));
        
        for (let i = 0; i < textRects.length; i++) {
          for (let j = i + 1; j < textRects.length; j++) {
            const rect1 = textRects[i].rect;
            const rect2 = textRects[j].rect;
            
            // Check for overlap
            if (!(rect1.right < rect2.left || 
                  rect2.right < rect1.left || 
                  rect1.bottom < rect2.top || 
                  rect2.bottom < rect1.top)) {
              overlappingText.push({
                text1: textRects[i].content,
                text2: textRects[j].content
              });
            }
          }
        }
        
        // Check data point density
        const chartArea = svg.getBoundingClientRect();
        const dataPointDensity = dataPoints.length / (chartArea.width * chartArea.height) * 10000;
        
        return {
          svgWidth: svg.getAttribute('width'),
          svgHeight: svg.getAttribute('height'),
          textCount: textElements.length,
          minTextSize: Math.min(...textSizes),
          avgTextSize: textSizes.reduce((a, b) => a + b, 0) / textSizes.length,
          dataPointCount: dataPoints.length,
          dataPointDensity: dataPointDensity,
          axisTickCount: axisLines.length,
          overlappingTextCount: overlappingText.length,
          overlappingExamples: overlappingText.slice(0, 3)
        };
      });
      
      // Calculate readability score
      const readabilityScore = {
        viewport: viewport,
        metrics: metrics,
        issues: []
      };
      
      if (metrics) {
        // Check for readability issues
        if (metrics.minTextSize < 10) {
          readabilityScore.issues.push(`Text too small: ${metrics.minTextSize}px`);
        }
        if (metrics.overlappingTextCount > 0) {
          readabilityScore.issues.push(`${metrics.overlappingTextCount} overlapping text elements`);
        }
        if (metrics.dataPointDensity > 1) {
          readabilityScore.issues.push(`High data density: ${metrics.dataPointDensity.toFixed(2)} points/100px²`);
        }
        if (metrics.axisTickCount < 5) {
          readabilityScore.issues.push(`Too few axis ticks: ${metrics.axisTickCount}`);
        }
        
        readabilityScore.readable = readabilityScore.issues.length === 0;
      }
      
      readabilityReport.push(readabilityScore);
      
      // Take close-up screenshot of first chart
      const firstChart = await page.$('div.bg-white.p-4.rounded-lg.shadow');
      if (firstChart) {
        await firstChart.screenshot({
          path: `/home/dwdra/tmp/tests/playwright_png/readability-${viewport}px.png`
        });
      }
      
      await page.close();
    }
    
    // Display readability report
    console.log('=== Chart Readability Analysis ===\n');
    
    readabilityReport.forEach(report => {
      const status = report.readable ? '✅' : '⚠️';
      console.log(`${status} ${report.viewport}px viewport:`);
      
      if (report.metrics) {
        console.log(`   SVG: ${report.metrics.svgWidth}×${report.metrics.svgHeight}`);
        console.log(`   Text: ${report.metrics.textCount} elements, ${report.metrics.minTextSize}px min size`);
        console.log(`   Data: ${report.metrics.dataPointCount} points`);
        
        if (report.issues.length > 0) {
          console.log('   Issues:');
          report.issues.forEach(issue => {
            console.log(`     - ${issue}`);
          });
        }
      }
      console.log('');
    });
    
    // Recommendations
    console.log('=== Readability Recommendations ===');
    console.log('1. Maintain minimum font size of 10px');
    console.log('2. Reduce tick density on narrow viewports');
    console.log('3. Consider hiding secondary elements below 400px');
    console.log('4. Implement smart label rotation/hiding for axis labels');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();