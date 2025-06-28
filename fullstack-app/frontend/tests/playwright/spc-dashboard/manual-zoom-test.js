const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions to see what's happening
  });
  const page = await browser.newPage();
  
  try {
    console.log('=== Manual Zoom Sync Test ===\n');
    console.log('This test will run with browser visible so you can see what\'s happening.\n');
    
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to SPC dashboard
    console.log('1. Navigating to SPC dashboard...');
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Wait for page to fully load
    console.log('2. Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/manual-test-1-initial.png',
      fullPage: true 
    });
    console.log('   Screenshot saved: manual-test-1-initial.png');
    
    // Check what's on the page
    const pageState = await page.evaluate(() => {
      return {
        title: document.title,
        chartContainers: document.querySelectorAll('.bg-white.rounded-lg.shadow').length,
        svgs: document.querySelectorAll('svg').length,
        buttons: Array.from(document.querySelectorAll('button'))
          .map(b => b.textContent?.trim())
          .filter(text => text && (text.includes('Timeline') || text.includes('Variability')))
      };
    });
    
    console.log('\n3. Page state:');
    console.log(`   Title: ${pageState.title}`);
    console.log(`   Chart containers: ${pageState.chartContainers}`);
    console.log(`   SVGs: ${pageState.svgs}`);
    console.log(`   Tab buttons: ${pageState.buttons.join(', ')}`);
    
    if (pageState.chartContainers === 0) {
      console.log('\n   ERROR: No chart containers found. The page might not have loaded correctly.');
      console.log('   Please check if the development server is running.');
      await page.waitForTimeout(10000);
      return;
    }
    
    // Find and click the first Variability button
    console.log('\n4. Clicking first Variability tab...');
    const variabilityButtons = await page.$$('button:text("Variability")');
    console.log(`   Found ${variabilityButtons.length} Variability buttons`);
    
    if (variabilityButtons.length > 0) {
      await variabilityButtons[0].click();
      await page.waitForTimeout(3000);
      
      // Take screenshot after clicking
      await page.screenshot({ 
        path: '/home/dwdra/tmp/tests/playwright_png/manual-test-2-variability.png',
        fullPage: true 
      });
      console.log('   Screenshot saved: manual-test-2-variability.png');
      
      // Check if Variability chart loaded
      const varChartState = await page.evaluate(() => {
        const containers = document.querySelectorAll('.variability-chart-container');
        const svgs = document.querySelectorAll('svg');
        const zoomControls = document.querySelectorAll('.zoom-controls');
        
        return {
          variabilityContainers: containers.length,
          svgs: svgs.length,
          zoomControls: zoomControls.length,
          firstSvgInfo: svgs[0] ? {
            width: svgs[0].getAttribute('width'),
            height: svgs[0].getAttribute('height'),
            parentClasses: svgs[0].parentElement?.className
          } : null
        };
      });
      
      console.log('\n5. After clicking Variability:');
      console.log(`   Variability containers: ${varChartState.variabilityContainers}`);
      console.log(`   SVGs: ${varChartState.svgs}`);
      console.log(`   Zoom controls: ${varChartState.zoomControls}`);
      if (varChartState.firstSvgInfo) {
        console.log(`   First SVG: ${varChartState.firstSvgInfo.width}x${varChartState.firstSvgInfo.height}`);
      }
      
      // Try to zoom if we have an SVG
      if (varChartState.svgs > 0) {
        console.log('\n6. Attempting to zoom on Y-axis...');
        
        // Find the first chart's SVG
        const svgElement = await page.$('svg');
        if (svgElement) {
          const bounds = await svgElement.boundingBox();
          if (bounds) {
            // Move to Y-axis area and zoom
            console.log(`   Moving mouse to Y-axis area: (${bounds.x + 35}, ${bounds.y + bounds.height/2})`);
            await page.mouse.move(bounds.x + 35, bounds.y + bounds.height / 2);
            
            console.log('   Scrolling to zoom in...');
            await page.mouse.wheel(0, -240);
            await page.waitForTimeout(2000);
            
            // Check zoom controls
            const zoomText = await page.$eval('.zoom-controls', el => el.textContent).catch(() => 'not found');
            console.log(`   Zoom controls text: ${zoomText}`);
            
            // Take screenshot after zoom
            await page.screenshot({ 
              path: '/home/dwdra/tmp/tests/playwright_png/manual-test-3-zoomed.png',
              fullPage: true 
            });
            console.log('   Screenshot saved: manual-test-3-zoomed.png');
          }
        }
      }
    }
    
    console.log('\n7. Test complete. Browser will remain open for 30 seconds...');
    console.log('   You can interact with the page manually to verify functionality.');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('\nTest failed:', error);
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/manual-test-error.png' 
    });
  } finally {
    await browser.close();
  }
})();