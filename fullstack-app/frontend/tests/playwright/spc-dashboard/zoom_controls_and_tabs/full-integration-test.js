const { chromium } = require('playwright');

/**
 * Comprehensive integration test for all improvements:
 * 1. Label stacking fix
 * 2. Layout improvements (title above tabs)
 * 3. Zoom controls positioning
 * 4. Timeline/Variability tabs functionality
 * 5. Responsive behavior
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Full Integration Test: All Improvements ===\n');
    
    const testResults = {
      labelStacking: false,
      layoutImprovement: false,
      zoomControls: false,
      tabFunctionality: false,
      responsiveDesign: false
    };
    
    const viewports = [800, 1200, 1600];
    
    for (const width of viewports) {
      console.log(`\n--- Testing at ${width}px viewport ---`);
      
      const page = await browser.newPage();
      await page.setViewportSize({ width, height: 800 });
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
      await page.waitForSelector('svg', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Test 1: Label stacking
      console.log('1. Testing label stacking...');
      
      // Resize multiple times
      const resizes = [width - 200, width + 100, width - 100];
      let maxLabelCount = 0;
      let minLabelCount = Infinity;
      
      for (const newWidth of resizes) {
        await page.setViewportSize({ width: newWidth, height: 800 });
        await page.waitForTimeout(1000);
        
        const labelCount = await page.evaluate(() => {
          return document.querySelectorAll('.axis text').length;
        });
        
        maxLabelCount = Math.max(maxLabelCount, labelCount);
        minLabelCount = Math.min(minLabelCount, labelCount);
      }
      
      const labelVariation = maxLabelCount - minLabelCount;
      const labelStackingOk = labelVariation <= 10;
      console.log(`   Label count variation: ${labelVariation} ${labelStackingOk ? '✅' : '❌'}`);
      
      if (labelStackingOk) testResults.labelStacking = true;
      
      // Reset viewport
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(1000);
      
      // Test 2: Layout improvement
      console.log('2. Testing layout improvement...');
      
      const layoutAnalysis = await page.evaluate(() => {
        const containers = document.querySelectorAll('.bg-white.rounded-lg.shadow');
        let titleAboveCount = 0;
        let totalCharts = 0;
        
        containers.forEach(container => {
          const title = container.querySelector('h4');
          const tabsSection = container.querySelector('.flex.border-b');
          
          if (title && tabsSection) {
            totalCharts++;
            const titleRect = title.getBoundingClientRect();
            const tabsRect = tabsSection.getBoundingClientRect();
            
            if (titleRect.bottom <= tabsRect.top) {
              titleAboveCount++;
            }
          }
        });
        
        return { titleAboveCount, totalCharts };
      });
      
      const layoutOk = layoutAnalysis.titleAboveCount === layoutAnalysis.totalCharts;
      console.log(`   Titles above tabs: ${layoutAnalysis.titleAboveCount}/${layoutAnalysis.totalCharts} ${layoutOk ? '✅' : '❌'}`);
      
      if (layoutOk) testResults.layoutImprovement = true;
      
      // Test 3: Tab functionality
      console.log('3. Testing tab functionality...');
      
      // Count tabs
      const tabAnalysis = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[class*="text-sm"][class*="font-medium"]'));
        const timelineTabs = buttons.filter(b => b.textContent.includes('Timeline')).length;
        const variabilityTabs = buttons.filter(b => b.textContent.includes('Variability')).length;
        const activeTimelineTabs = buttons.filter(b => 
          b.textContent.includes('Timeline') && b.className.includes('text-blue-600')
        ).length;
        
        return {
          timelineTabs,
          variabilityTabs,
          activeTimelineTabs,
          expectedCharts: 3
        };
      });
      
      const tabsOk = tabAnalysis.timelineTabs === 3 && 
                    tabAnalysis.variabilityTabs === 3 && 
                    tabAnalysis.activeTimelineTabs === 3;
      
      console.log(`   Timeline tabs: ${tabAnalysis.timelineTabs}/3 ${tabAnalysis.timelineTabs === 3 ? '✅' : '❌'}`);
      console.log(`   Variability tabs: ${tabAnalysis.variabilityTabs}/3 ${tabAnalysis.variabilityTabs === 3 ? '✅' : '❌'}`);
      console.log(`   Active Timeline tabs: ${tabAnalysis.activeTimelineTabs}/3 ${tabAnalysis.activeTimelineTabs === 3 ? '✅' : '❌'}`);
      
      if (tabsOk) testResults.tabFunctionality = true;
      
      // Test tab switching
      const variabilityTabs = await page.$$eval('button', buttons => 
        buttons.filter(b => b.textContent.includes('Variability'))
      );
      
      if (variabilityTabs.length > 0) {
        // Click first variability tab
        await page.click('button:text("Variability")');
        await page.waitForTimeout(500);
        
        const placeholderVisible = await page.evaluate(() => {
          return !!document.querySelector('.bg-gray-50.rounded-lg.border-dashed');
        });
        
        console.log(`   Variability content shows: ${placeholderVisible ? '✅' : '❌'}`);
        
        // Switch back
        await page.click('button:text("Timeline")');
        await page.waitForTimeout(500);
      }
      
      // Test 4: Zoom controls positioning
      console.log('4. Testing zoom controls...');
      
      // Trigger zoom
      const firstChart = await page.$('.bg-white.rounded-lg.shadow');
      if (firstChart) {
        const box = await firstChart.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height - 50);
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(500);
        
        const zoomControlsAnalysis = await page.evaluate(() => {
          const controls = Array.from(document.querySelectorAll('[style*="position: absolute"]'))
            .filter(el => el.textContent.includes('Zoom:'));
          
          return controls.map(control => ({
            topPosition: parseFloat(control.style.top),
            leftPosition: parseFloat(control.style.left),
            hasResetButton: !!control.querySelector('button')
          }));
        });
        
        const zoomControlsOk = zoomControlsAnalysis.length > 0 && 
                              zoomControlsAnalysis.every(c => c.topPosition >= 5 && c.topPosition <= 15);
        
        console.log(`   Zoom controls positioned correctly: ${zoomControlsOk ? '✅' : '❌'}`);
        
        if (zoomControlsOk) testResults.zoomControls = true;
        
        // Reset zoom
        const resetButton = await page.$('button:has-text("Reset")');
        if (resetButton) await resetButton.click();
        await page.waitForTimeout(500);
      }
      
      // Test 5: Responsive design
      console.log('5. Testing responsive design...');
      
      const responsiveAnalysis = await page.evaluate(() => {
        const containers = document.querySelectorAll('.bg-white.rounded-lg.shadow');
        const svgs = document.querySelectorAll('svg');
        let overflowIssues = 0;
        
        containers.forEach((container, index) => {
          const containerRect = container.getBoundingClientRect();
          const svg = container.querySelector('svg');
          
          if (svg) {
            const svgRect = svg.getBoundingClientRect();
            if (svgRect.width > containerRect.width) {
              overflowIssues++;
            }
          }
        });
        
        return {
          totalCharts: containers.length,
          overflowIssues,
          viewportWidth: window.innerWidth
        };
      });
      
      const responsiveOk = responsiveAnalysis.overflowIssues === 0;
      console.log(`   No overflow issues: ${responsiveOk ? '✅' : '❌'} (${responsiveAnalysis.overflowIssues}/${responsiveAnalysis.totalCharts})`);
      
      if (responsiveOk) testResults.responsiveDesign = true;
      
      await page.close();
    }
    
    // Final results
    console.log('\n=== Integration Test Results ===');
    console.log(`Label Stacking Fixed: ${testResults.labelStacking ? '✅' : '❌'}`);
    console.log(`Layout Improved: ${testResults.layoutImprovement ? '✅' : '❌'}`);
    console.log(`Zoom Controls: ${testResults.zoomControls ? '✅' : '❌'}`);
    console.log(`Tab Functionality: ${testResults.tabFunctionality ? '✅' : '❌'}`);
    console.log(`Responsive Design: ${testResults.responsiveDesign ? '✅' : '❌'}`);
    
    const allTestsPassed = Object.values(testResults).every(result => result);
    console.log(`\nOverall Status: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    // Take final screenshot
    const finalPage = await browser.newPage();
    await finalPage.setViewportSize({ width: 1200, height: 800 });
    await finalPage.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await finalPage.waitForSelector('svg', { timeout: 10000 });
    await finalPage.waitForTimeout(2000);
    
    await finalPage.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/full-integration-final.png',
      fullPage: true 
    });
    
    await finalPage.close();
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync(
      '/home/dwdra/tmp/tests/playwright_md/full-integration-results.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        testResults,
        allTestsPassed,
        viewportsTested: viewports
      }, null, 2)
    );
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();