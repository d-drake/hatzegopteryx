const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();
  
  try {
    console.log('=== Debug Width Calculation ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Set to problematic width
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Inject debugging
    await page.evaluate(() => {
      // Override ResponsiveChartWrapper to log what it's doing
      const charts = document.querySelectorAll('.flex.gap-\\[5px\\] > div');
      
      charts.forEach((chart, index) => {
        const chartName = index === 0 ? 'Timeline' : 'Variability';
        console.log(`\n=== ${chartName} Chart ===`);
        
        // Get all nested divs to understand the structure
        const divs = chart.querySelectorAll('div');
        console.log(`Found ${divs.length} nested divs`);
        
        // Log each div's dimensions
        divs.forEach((div, i) => {
          const rect = div.getBoundingClientRect();
          const style = window.getComputedStyle(div);
          console.log(`Div ${i}:`, {
            width: rect.width,
            styleWidth: style.width,
            maxWidth: style.maxWidth,
            padding: style.padding,
            boxSizing: style.boxSizing,
            classes: div.className
          });
        });
        
        // Find SVG
        const svg = chart.querySelector('svg');
        if (svg) {
          console.log('\nSVG:', {
            width: svg.getAttribute('width'),
            viewBox: svg.getAttribute('viewBox'),
            actualWidth: svg.getBoundingClientRect().width
          });
        }
        
        // Check the chart container's computed width
        const containerRect = chart.getBoundingClientRect();
        console.log('\nContainer:', {
          width: containerRect.width,
          styleWidth: chart.style.width,
          computedWidth: window.getComputedStyle(chart).width
        });
      });
    });
    
    // Get the console logs
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    // Wait a bit for logs
    await page.waitForTimeout(1000);
    
    // Print collected logs
    console.log('\nBrowser console output:');
    logs.forEach(log => console.log(log));
    
    // Also do our own analysis
    const analysis = await page.evaluate(() => {
      const flexContainer = document.querySelector('.flex.gap-\\[5px\\]');
      if (!flexContainer) return null;
      
      const variabilityContainer = flexContainer.children[1];
      const responsiveWrapper = variabilityContainer?.querySelector(':scope > div');
      const svg = variabilityContainer?.querySelector('svg');
      
      return {
        container: {
          width: variabilityContainer?.getBoundingClientRect().width,
          styleWidth: variabilityContainer?.style.width,
          scrollWidth: variabilityContainer?.scrollWidth,
          clientWidth: variabilityContainer?.clientWidth,
          offsetWidth: variabilityContainer?.offsetWidth
        },
        wrapper: responsiveWrapper ? {
          width: responsiveWrapper.getBoundingClientRect().width,
          styleWidth: window.getComputedStyle(responsiveWrapper).width,
          maxWidth: window.getComputedStyle(responsiveWrapper).maxWidth,
          padding: window.getComputedStyle(responsiveWrapper).padding
        } : null,
        svg: svg ? {
          attrWidth: svg.getAttribute('width'),
          actualWidth: svg.getBoundingClientRect().width,
          parentWidth: svg.parentElement?.getBoundingClientRect().width
        } : null
      };
    });
    
    console.log('\n\nVariability Chart Analysis:');
    console.log('Container:', analysis.container);
    console.log('Wrapper:', analysis.wrapper);
    console.log('SVG:', analysis.svg);
    
    if (analysis.container && analysis.svg) {
      const overflow = analysis.svg.actualWidth - analysis.container.width;
      console.log(`\nOverflow: ${overflow > 0 ? overflow.toFixed(1) + 'px' : 'None'}`);
    }
    
    console.log('\nBrowser will remain open for inspection...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();