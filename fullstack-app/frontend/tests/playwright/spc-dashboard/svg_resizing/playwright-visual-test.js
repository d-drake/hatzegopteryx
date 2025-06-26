const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Set a specific viewport size
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Navigate to the SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Wait for charts to load
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for animations
    
    // Take screenshots of specific chart containers
    const chartContainers = await page.$$('div.bg-white.p-4.rounded-lg.shadow');
    
    for (let i = 0; i < chartContainers.length; i++) {
      await chartContainers[i].screenshot({ 
        path: `tests/chart-container-${i}.png`
      });
    }
    
    // Check container vs SVG widths
    const containerInfo = await page.evaluate(() => {
      const containers = document.querySelectorAll('div.bg-white.p-4.rounded-lg.shadow');
      const info = [];
      
      containers.forEach((container, index) => {
        const containerRect = container.getBoundingClientRect();
        const svg = container.querySelector('svg');
        const svgRect = svg ? svg.getBoundingClientRect() : null;
        
        // Check computed styles
        const containerStyles = window.getComputedStyle(container);
        const svgWidth = svg ? svg.getAttribute('width') : null;
        
        info.push({
          index,
          containerWidth: containerRect.width,
          containerPadding: containerStyles.padding,
          svgWidth: svgWidth ? parseInt(svgWidth) : 0,
          svgActualWidth: svgRect ? svgRect.width : 0,
          overflow: containerStyles.overflow
        });
      });
      
      return info;
    });
    
    console.log('Container vs SVG analysis:');
    containerInfo.forEach(info => {
      console.log(`Container ${info.index}:`);
      console.log(`  Container width: ${info.containerWidth}px`);
      console.log(`  Container padding: ${info.containerPadding}`);
      console.log(`  SVG width attribute: ${info.svgWidth}px`);
      console.log(`  SVG actual width: ${info.svgActualWidth}px`);
      console.log(`  Container overflow: ${info.overflow}`);
    });
    
    // Check if legends are visible in viewport
    const viewportCheck = await page.evaluate(() => {
      const checks = [];
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      const texts = document.querySelectorAll('text');
      texts.forEach(text => {
        const content = text.textContent || '';
        if (content.includes('property') || content.includes('FP1_')) {
          const rect = text.getBoundingClientRect();
          checks.push({
            text: content,
            left: rect.left,
            right: rect.right,
            viewportWidth: viewport.width,
            isFullyVisible: rect.right <= viewport.width,
            overflow: rect.right > viewport.width ? rect.right - viewport.width : 0
          });
        }
      });
      
      return checks;
    });
    
    console.log('\nViewport visibility check:');
    viewportCheck.forEach(check => {
      if (!check.isFullyVisible) {
        console.log(`"${check.text}" - Right edge: ${check.right}px, Viewport: ${check.viewportWidth}px, Overflow: ${check.overflow}px`);
      }
    });
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
})();