const { chromium } = require('playwright');

/**
 * Responsive Layout Test
 * Verifies layout positioning at different viewport sizes
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Responsive Layout Test ===\n');
    
    const viewportSizes = [
      { width: 1200, height: 800, name: 'Desktop' },
      { width: 1024, height: 768, name: 'Small Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 500, height: 800, name: 'Mobile' }
    ];
    
    const page = await browser.newPage();
    
    for (const viewport of viewportSizes) {
      console.log(`\n📱 Testing ${viewport.name} (${viewport.width}x${viewport.height}):`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForSelector('.bg-white.rounded-lg.shadow', { timeout: 10000 });
      await page.waitForTimeout(1000);
      
      const measurements = await page.evaluate(() => {
        const container = document.querySelector('.bg-white.rounded-lg.shadow');
        if (!container) return null;
        
        const containerRect = container.getBoundingClientRect();
        
        // Find elements
        const title = container.querySelector('h4');
        const tabGroup = container.querySelector('.flex.border-b.border-gray-200');
        const zoomArea = container.querySelector('.px-4.pt-0.pb-2[style*="position: relative"]');
        const svg = container.querySelector('svg');
        
        const result = {
          containerWidth: containerRect.width,
          elements: {},
          gaps: {},
          issues: []
        };
        
        // Check if elements exist and measure
        if (title) {
          const rect = title.getBoundingClientRect();
          result.elements.title = {
            visible: rect.width > 0 && rect.height > 0,
            width: rect.width
          };
        }
        
        if (tabGroup) {
          const rect = tabGroup.getBoundingClientRect();
          result.elements.tabGroup = {
            visible: rect.width > 0 && rect.height > 0,
            overflows: rect.right > containerRect.right
          };
          
          // Count visible tabs
          const tabs = tabGroup.querySelectorAll('button');
          result.elements.tabCount = tabs.length;
          result.elements.visibleTabs = Array.from(tabs).filter(tab => {
            const tabRect = tab.getBoundingClientRect();
            return tabRect.width > 0 && tabRect.right <= containerRect.right;
          }).length;
        }
        
        if (svg) {
          const rect = svg.getBoundingClientRect();
          result.elements.svg = {
            visible: rect.width > 0 && rect.height > 0,
            width: rect.width,
            height: rect.height
          };
        }
        
        // Calculate gaps
        if (tabGroup && zoomArea) {
          const tabRect = tabGroup.getBoundingClientRect();
          const zoomRect = zoomArea.getBoundingClientRect();
          result.gaps.tabToZoom = zoomRect.top - tabRect.bottom;
        }
        
        if (zoomArea && svg) {
          const zoomRect = zoomArea.getBoundingClientRect();
          const svgRect = svg.getBoundingClientRect();
          result.gaps.zoomToSvg = svgRect.top - zoomRect.bottom;
        }
        
        // Check for layout issues
        if (result.elements.tabGroup?.overflows) {
          result.issues.push('Tab group overflows container');
        }
        
        if (result.elements.svg && result.elements.svg.width < 200) {
          result.issues.push('Chart too narrow');
        }
        
        return result;
      });
      
      if (!measurements) {
        console.log('  ❌ Could not find chart container');
        continue;
      }
      
      // Display results
      console.log(`  Container width: ${measurements.containerWidth}px`);
      
      if (measurements.elements.title) {
        console.log(`  Title visible: ${measurements.elements.title.visible ? '✅' : '❌'}`);
      }
      
      if (measurements.elements.tabGroup) {
        console.log(`  Tabs: ${measurements.elements.visibleTabs}/${measurements.elements.tabCount} visible`);
        if (measurements.elements.tabGroup.overflows) {
          console.log(`  ⚠️  Tab overflow detected`);
        }
      }
      
      if (measurements.elements.svg) {
        console.log(`  Chart dimensions: ${measurements.elements.svg.width}x${measurements.elements.svg.height}px`);
      }
      
      console.log(`  Gaps maintained:`);
      console.log(`    Tab to Zoom: ${measurements.gaps.tabToZoom || 'N/A'}px`);
      console.log(`    Zoom to SVG: ${measurements.gaps.zoomToSvg || 'N/A'}px`);
      
      if (measurements.issues.length > 0) {
        console.log(`  ⚠️  Issues detected:`);
        measurements.issues.forEach(issue => console.log(`     - ${issue}`));
      }
      
      // Take screenshot for this viewport
      await page.screenshot({ 
        path: `/home/dwdra/tmp/tests/playwright_png/layout-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: false 
      });
    }
    
    console.log('\n✅ Responsive test complete. Screenshots saved.');
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();