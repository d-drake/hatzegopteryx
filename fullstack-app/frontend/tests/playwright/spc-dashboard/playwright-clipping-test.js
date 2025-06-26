const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Check for SVG viewBox and overflow settings
    const svgAnalysis = await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      const analysis = [];
      
      svgs.forEach((svg, index) => {
        // Check if any parent elements have overflow hidden
        let element = svg;
        const overflowChain = [];
        
        while (element && element !== document.body) {
          const styles = window.getComputedStyle(element);
          if (styles.overflow !== 'visible') {
            overflowChain.push({
              tag: element.tagName,
              class: element.className,
              overflow: styles.overflow,
              width: element.getBoundingClientRect().width
            });
          }
          element = element.parentElement;
        }
        
        // Check SVG attributes
        const svgInfo = {
          index,
          width: svg.getAttribute('width'),
          height: svg.getAttribute('height'),
          viewBox: svg.getAttribute('viewBox'),
          overflow: window.getComputedStyle(svg).overflow,
          overflowChain
        };
        
        // Check for clipping
        const clipPaths = svg.querySelectorAll('clipPath');
        svgInfo.clipPaths = [];
        
        clipPaths.forEach(clip => {
          const rect = clip.querySelector('rect');
          if (rect) {
            svgInfo.clipPaths.push({
              id: clip.id,
              x: rect.getAttribute('x'),
              y: rect.getAttribute('y'),
              width: rect.getAttribute('width'),
              height: rect.getAttribute('height')
            });
          }
        });
        
        // Find elements using clip paths
        const clippedElements = svg.querySelectorAll('[clip-path]');
        svgInfo.clippedElementCount = clippedElements.length;
        
        analysis.push(svgInfo);
      });
      
      return analysis;
    });
    
    console.log('SVG Analysis:');
    svgAnalysis.forEach(svg => {
      console.log(`\nSVG ${svg.index}:`);
      console.log(`  Dimensions: ${svg.width}x${svg.height}`);
      console.log(`  ViewBox: ${svg.viewBox || 'none'}`);
      console.log(`  SVG overflow: ${svg.overflow}`);
      
      if (svg.overflowChain.length > 0) {
        console.log('  Overflow chain:');
        svg.overflowChain.forEach(item => {
          console.log(`    ${item.tag}.${item.class}: ${item.overflow} (width: ${item.width}px)`);
        });
      }
      
      if (svg.clipPaths.length > 0) {
        console.log('  Clip paths:');
        svg.clipPaths.forEach(clip => {
          console.log(`    #${clip.id}: rect(${clip.x}, ${clip.y}, ${clip.width}, ${clip.height})`);
        });
        console.log(`  Elements using clip-path: ${svg.clippedElementCount}`);
      }
    });
    
    // Check legend rendering
    const legendAnalysis = await page.evaluate(() => {
      const results = [];
      
      // Find all legend text elements
      document.querySelectorAll('text').forEach(text => {
        const content = text.textContent || '';
        if (content === 'fake property1') {
          const rect = text.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(text);
          
          // Get the actual rendered text
          const range = document.createRange();
          range.selectNodeContents(text);
          const rangeRect = range.getBoundingClientRect();
          
          // Check parent SVG
          const svg = text.closest('svg');
          const svgRect = svg ? svg.getBoundingClientRect() : null;
          
          results.push({
            text: content,
            textRect: {
              left: rect.left,
              right: rect.right,
              width: rect.width
            },
            rangeRect: {
              left: rangeRect.left,
              right: rangeRect.right,
              width: rangeRect.width
            },
            svgRect: svgRect ? {
              left: svgRect.left,
              right: svgRect.right,
              width: svgRect.width
            } : null,
            overflow: computedStyle.overflow,
            visibility: computedStyle.visibility,
            display: computedStyle.display,
            opacity: computedStyle.opacity
          });
        }
      });
      
      return results;
    });
    
    console.log('\nLegend "fake property1" analysis:');
    legendAnalysis.forEach(item => {
      console.log(`Text bounding rect: left=${item.textRect.left}, right=${item.textRect.right}, width=${item.textRect.width}`);
      console.log(`Range rect: left=${item.rangeRect.left}, right=${item.rangeRect.right}, width=${item.rangeRect.width}`);
      if (item.svgRect) {
        console.log(`SVG rect: left=${item.svgRect.left}, right=${item.svgRect.right}, width=${item.svgRect.width}`);
        console.log(`Text extends beyond SVG: ${item.textRect.right > item.svgRect.right}`);
      }
      console.log(`Styles: visibility=${item.visibility}, display=${item.display}, opacity=${item.opacity}`);
    });
    
    // Take a close-up screenshot of the legend area
    const firstChart = await page.$('svg');
    if (firstChart) {
      const box = await firstChart.boundingBox();
      if (box) {
        await page.screenshot({
          path: 'tests/legend-area-closeup.png',
          clip: {
            x: box.x + box.width - 300,
            y: box.y,
            width: 300,
            height: 200
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();