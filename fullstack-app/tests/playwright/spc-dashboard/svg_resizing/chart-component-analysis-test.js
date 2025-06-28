const { chromium } = require('playwright');

/**
 * Analyze chart component structure and width propagation
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.setViewportSize({ width: 800, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Analyze component hierarchy and width propagation
    const componentAnalysis = await page.evaluate(() => {
      const results = {
        pageStructure: {},
        chartComponents: [],
        widthPropagation: []
      };
      
      // Analyze page structure
      const body = document.body;
      const main = document.querySelector('main');
      const chartSection = document.querySelector('div.mt-8');
      
      results.pageStructure = {
        body: {
          width: body.clientWidth,
          scrollWidth: body.scrollWidth,
          hasHorizontalScroll: body.scrollWidth > body.clientWidth
        },
        main: main ? {
          className: main.className,
          width: main.getBoundingClientRect().width,
          computedMaxWidth: window.getComputedStyle(main).maxWidth
        } : null,
        chartSection: chartSection ? {
          className: chartSection.className,
          width: chartSection.getBoundingClientRect().width
        } : null
      };
      
      // Analyze each chart component
      const chartContainers = document.querySelectorAll('div.bg-white.p-4.rounded-lg.shadow');
      chartContainers.forEach((container, index) => {
        const svg = container.querySelector('svg');
        const chartTitle = container.querySelector('h4')?.textContent || 'Unknown';
        
        // Get React props if available (from devtools)
        const reactProps = svg?.__reactInternalInstance?.memoizedProps || {};
        
        // Analyze nested structure
        const nestedStructure = [];
        let current = svg;
        while (current && current !== container) {
          nestedStructure.push({
            tag: current.tagName,
            className: current.className || '',
            width: current.getBoundingClientRect().width,
            style: {
              width: current.style.width,
              maxWidth: current.style.maxWidth
            }
          });
          current = current.parentElement;
        }
        
        results.chartComponents.push({
          index,
          title: chartTitle,
          container: {
            width: container.getBoundingClientRect().width,
            clientWidth: container.clientWidth,
            scrollWidth: container.scrollWidth,
            overflow: window.getComputedStyle(container).overflowX
          },
          svg: svg ? {
            width: svg.getAttribute('width'),
            height: svg.getAttribute('height'),
            actualWidth: svg.getBoundingClientRect().width,
            props: {
              width: reactProps.width,
              height: reactProps.height,
              margin: reactProps.margin
            }
          } : null,
          nestedStructure
        });
      });
      
      // Track width from source
      const firstContainer = chartContainers[0];
      if (firstContainer) {
        const containerRect = firstContainer.getBoundingClientRect();
        const svg = firstContainer.querySelector('svg');
        
        results.widthPropagation = [
          { level: 'Viewport', width: window.innerWidth },
          { level: 'Body', width: body.clientWidth },
          { level: 'Main', width: main?.getBoundingClientRect().width || 0 },
          { level: 'Container', width: containerRect.width },
          { level: 'Container Content', width: containerRect.width - 32 }, // 16px padding each side
          { level: 'SVG Attribute', width: svg?.getAttribute('width') || '0' },
          { level: 'SVG Actual', width: svg?.getBoundingClientRect().width || 0 }
        ];
      }
      
      return results;
    });
    
    // Display analysis
    console.log('=== Chart Component Structure Analysis ===\n');
    
    console.log('Page Structure:');
    console.log(`  Body: ${componentAnalysis.pageStructure.body.width}px`);
    console.log(`  Main: ${componentAnalysis.pageStructure.main?.width}px (max-width: ${componentAnalysis.pageStructure.main?.computedMaxWidth})`);
    console.log(`  Has horizontal scroll: ${componentAnalysis.pageStructure.body.hasHorizontalScroll}`);
    
    console.log('\nWidth Propagation Chain:');
    componentAnalysis.widthPropagation.forEach(item => {
      console.log(`  ${item.level}: ${item.width}px`);
    });
    
    console.log('\nChart Components:');
    componentAnalysis.chartComponents.forEach(chart => {
      console.log(`\n  Chart ${chart.index}: ${chart.title}`);
      console.log(`    Container: ${chart.container.width}px (overflow: ${chart.container.overflow})`);
      console.log(`    SVG: ${chart.svg?.width}px × ${chart.svg?.height}px`);
      console.log(`    Has scroll: ${chart.container.scrollWidth > chart.container.clientWidth}`);
    });
    
    // Save analysis
    const fs = require('fs');
    fs.writeFileSync(
      '/home/dwdra/tmp/tests/playwright_md/chart-component-analysis.json',
      JSON.stringify(componentAnalysis, null, 2)
    );
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();