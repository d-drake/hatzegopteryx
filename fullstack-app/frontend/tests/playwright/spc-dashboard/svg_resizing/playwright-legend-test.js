const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Wait for charts to load
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for animations
    
    // Take a screenshot to visualize the issue
    await page.screenshot({ 
      path: 'tests/legend-cutoff-issue.png',
      fullPage: true 
    });
    
    // Check for legend text elements that might be cut off
    const legendIssues = await page.evaluate(() => {
      const issues = [];
      const svgs = document.querySelectorAll('svg');
      
      svgs.forEach((svg, svgIndex) => {
        const svgRect = svg.getBoundingClientRect();
        const svgWidth = parseInt(svg.getAttribute('width') || '0');
        
        // Find all text elements in the SVG
        const texts = svg.querySelectorAll('text');
        
        texts.forEach(text => {
          const content = text.textContent || '';
          
          // Check if this is a legend item (contains bias, property, FAKE, etc.)
          if (content.includes('bias') || 
              content.includes('property') || 
              content.includes('FAKE') ||
              content.includes('FP1_')) {
            
            const textRect = text.getBoundingClientRect();
            const svgBounds = svg.getBoundingClientRect();
            
            // Check if text is clipped by SVG boundary
            if (textRect.right > svgBounds.right) {
              // Find parent transforms to calculate absolute position
              let element = text;
              let totalX = 0;
              
              while (element && element !== svg) {
                if (element.getAttribute('transform')) {
                  const transform = element.getAttribute('transform');
                  const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
                  if (match) {
                    totalX += parseFloat(match[1]);
                  }
                }
                element = element.parentElement;
              }
              
              // Also check x attribute on text element
              const xAttr = text.getAttribute('x');
              if (xAttr) {
                totalX += parseFloat(xAttr);
              }
              
              const textLength = text.getComputedTextLength();
              const textEndX = totalX + textLength;
              
              issues.push({
                svgIndex,
                svgWidth,
                text: content,
                totalX,
                textLength,
                textEndX,
                overflow: textRect.right - svgBounds.right,
                isVisible: textRect.width > 0
              });
            }
          }
        });
      });
      
      return issues;
    });
    
    console.log('Legend cutoff issues found:', legendIssues.length);
    legendIssues.forEach(issue => {
      console.log(`Chart ${issue.svgIndex}: "${issue.text}" overflows by ${issue.overflow.toFixed(2)}px`);
      console.log(`  SVG width: ${issue.svgWidth}, Text starts at: ${issue.translateX}, Text length: ${issue.textLength.toFixed(2)}`);
    });
    
    // Check current margins and suggest fix
    const chartInfo = await page.evaluate(() => {
      const charts = [];
      const svgs = document.querySelectorAll('svg');
      
      svgs.forEach((svg, index) => {
        const width = parseInt(svg.getAttribute('width') || '0');
        const height = parseInt(svg.getAttribute('height') || '0');
        
        // Find the main chart group
        const mainG = svg.querySelector('g');
        const transform = mainG ? mainG.getAttribute('transform') : '';
        
        charts.push({
          index,
          width,
          height,
          transform
        });
      });
      
      return charts;
    });
    
    console.log('\nChart dimensions:');
    chartInfo.forEach(chart => {
      console.log(`Chart ${chart.index}: ${chart.width}x${chart.height}, transform: ${chart.transform}`);
    });
    
    // Debug: Find all legend items
    const allLegendItems = await page.evaluate(() => {
      const items = [];
      const svgs = document.querySelectorAll('svg');
      
      svgs.forEach((svg, svgIndex) => {
        const texts = svg.querySelectorAll('text');
        
        texts.forEach(text => {
          const content = text.textContent || '';
          
          if (content.includes('bias') || 
              content.includes('property') || 
              content.includes('FAKE') ||
              content.includes('FP1_')) {
            
            // Calculate total transform
            let element = text;
            let totalX = 0;
            let transforms = [];
            
            while (element && element !== svg) {
              if (element.getAttribute('transform')) {
                const transform = element.getAttribute('transform');
                transforms.push(transform);
                const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
                if (match) {
                  totalX += parseFloat(match[1]);
                }
              }
              element = element.parentElement;
            }
            
            const xAttr = text.getAttribute('x');
            if (xAttr) {
              totalX += parseFloat(xAttr);
            }
            
            const textBBox = text.getBBox();
            
            items.push({
              svgIndex,
              text: content,
              totalX,
              xAttr,
              transforms: transforms.join(' -> '),
              textWidth: textBBox.width,
              endX: totalX + textBBox.width
            });
          }
        });
      });
      
      return items;
    });
    
    console.log('\nAll legend items:');
    allLegendItems.forEach(item => {
      console.log(`Chart ${item.svgIndex}: "${item.text}"`);
      console.log(`  Position: x=${item.totalX}, width=${item.textWidth.toFixed(2)}, endX=${item.endX.toFixed(2)}`);
      console.log(`  Transforms: ${item.transforms}`);
    });
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
})();