const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== Verify SVG Scroll Prevention ===\n');
    
    // Navigate to SPC dashboard
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Set viewport for side-by-side mode
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.waitForTimeout(2000);
    
    // Check event listeners on SVG elements
    const svgInfo = await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      const info = [];
      
      svgs.forEach((svg, index) => {
        // Test if wheel event is prevented
        let defaultPrevented = false;
        const testHandler = (e) => {
          defaultPrevented = e.defaultPrevented;
        };
        
        // Dispatch a test wheel event
        svg.addEventListener('wheel', testHandler);
        const testEvent = new WheelEvent('wheel', {
          deltaY: 100,
          bubbles: true,
          cancelable: true
        });
        svg.dispatchEvent(testEvent);
        svg.removeEventListener('wheel', testHandler);
        
        const rect = svg.getBoundingClientRect();
        info.push({
          index,
          width: rect.width,
          height: rect.height,
          x: rect.x,
          y: rect.y,
          defaultPrevented,
          hasWheelListener: svg.onwheel !== null || defaultPrevented
        });
      });
      
      return info;
    });
    
    console.log('SVG Elements found:');
    svgInfo.forEach(svg => {
      console.log(`  SVG ${svg.index}:`);
      console.log(`    Position: (${svg.x}, ${svg.y})`);
      console.log(`    Size: ${svg.width}x${svg.height}`);
      console.log(`    Wheel prevention: ${svg.defaultPrevented ? '✅ Active' : '❌ Not active'}`);
      console.log(`    Has wheel listener: ${svg.hasWheelListener ? 'Yes' : 'No'}`);
    });
    
    // Test scroll prevention by dispatching events directly
    console.log('\nTesting scroll prevention:');
    
    // Add page scroll monitoring
    await page.evaluate(() => {
      window._scrollEvents = [];
      window.addEventListener('scroll', () => {
        window._scrollEvents.push({
          time: Date.now(),
          scrollY: window.scrollY
        });
      });
    });
    
    // Dispatch wheel events on Timeline SVG
    const scrollTest = await page.evaluate(() => {
      const timelineSvg = document.querySelector('svg'); // First SVG
      if (!timelineSvg) return { error: 'No Timeline SVG found' };
      
      const initialScrollY = window.scrollY;
      window._scrollEvents = [];
      
      // Dispatch multiple wheel events
      for (let i = 0; i < 5; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: 100,
          clientX: 400,
          clientY: 400,
          bubbles: true,
          cancelable: true
        });
        timelineSvg.dispatchEvent(wheelEvent);
      }
      
      // Wait a bit and check scroll
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            initialScrollY,
            finalScrollY: window.scrollY,
            scrollEvents: window._scrollEvents.length,
            svgFound: true
          });
        }, 500);
      });
    });
    
    console.log(`  Initial scroll: ${scrollTest.initialScrollY}px`);
    console.log(`  Final scroll: ${scrollTest.finalScrollY}px`);
    console.log(`  Scroll events fired: ${scrollTest.scrollEvents}`);
    console.log(`  Result: ${scrollTest.finalScrollY === scrollTest.initialScrollY ? '✅ Scroll prevented' : '❌ Page scrolled'}`);
    
    console.log('\nBrowser will remain open for manual testing...');
    console.log('Please test scrolling manually over the charts.');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();