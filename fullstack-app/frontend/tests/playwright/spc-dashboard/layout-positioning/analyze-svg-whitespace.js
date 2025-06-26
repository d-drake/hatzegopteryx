const { chromium } = require('playwright');

/**
 * Analyze SVG Whitespace
 * Understand the top margin and padding in the SVG
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Analyzing SVG Whitespace ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const analysis = await page.evaluate(() => {
      const container = document.querySelector('.bg-white.rounded-lg.shadow');
      const svg = container?.querySelector('svg');
      const chartG = svg?.querySelector('g.chart-content');
      
      if (!container || !svg) return null;
      
      const svgRect = svg.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Get the first visible element in the chart
      const firstDataElement = svg.querySelector('circle, rect, path[stroke]');
      const xAxisLine = svg.querySelector('.tick line');
      const yAxisLine = svg.querySelector('g[transform*="translate(0,"] line');
      
      const result = {
        svg: {
          width: svg.getAttribute('width'),
          height: svg.getAttribute('height'),
          viewBox: svg.getAttribute('viewBox'),
          position: {
            top: svgRect.top - containerRect.top,
            left: svgRect.left - containerRect.left
          }
        },
        chartContent: null,
        firstElements: {}
      };
      
      // Get chart content transform
      if (chartG) {
        const transform = chartG.getAttribute('transform');
        const match = transform?.match(/translate\((\d+),\s*(\d+)\)/);
        if (match) {
          result.chartContent = {
            translateX: parseInt(match[1]),
            translateY: parseInt(match[2])
          };
        }
      }
      
      // Find the topmost element
      let topMostY = Infinity;
      const elements = svg.querySelectorAll('circle, .tick, text, path[stroke]');
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < topMostY && rect.height > 0) {
          topMostY = rect.top;
          result.firstElements.topmost = {
            type: el.tagName,
            class: el.className.baseVal || el.className,
            top: rect.top - svgRect.top
          };
        }
      });
      
      // Get axis positions
      const xAxis = svg.querySelector('.x-axis');
      const yAxis = svg.querySelector('.y-axis');
      
      if (xAxis) {
        const rect = xAxis.getBoundingClientRect();
        result.xAxis = {
          top: rect.top - svgRect.top
        };
      }
      
      if (yAxis) {
        const rect = yAxis.getBoundingClientRect();
        result.yAxis = {
          top: rect.top - svgRect.top
        };
      }
      
      return result;
    });
    
    console.log('SVG Analysis:', JSON.stringify(analysis, null, 2));
    
    if (analysis) {
      console.log('\n📊 Key Findings:');
      console.log(`SVG dimensions: ${analysis.svg.width} x ${analysis.svg.height}`);
      
      if (analysis.chartContent) {
        console.log(`Chart content translated: (${analysis.chartContent.translateX}, ${analysis.chartContent.translateY})`);
        console.log(`Top margin in SVG: ${analysis.chartContent.translateY}px`);
      }
      
      if (analysis.firstElements.topmost) {
        console.log(`\nTopmost element: ${analysis.firstElements.topmost.type} at ${analysis.firstElements.topmost.top}px from SVG top`);
      }
      
      // Current margins in the code
      console.log('\n📏 Current Timeline margin setting: { top: 60, right: 240, bottom: 60, left: 70 }');
      console.log('This 60px top margin appears to be creating the whitespace');
    }
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();