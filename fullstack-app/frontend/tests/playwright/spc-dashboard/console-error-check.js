const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Collect console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });
  
  // Collect page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });
  
  try {
    console.log('=== Console Error Check ===\n');
    
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to SPC dashboard
    console.log('1. Navigating to SPC dashboard...');
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Wait for page to load
    console.log('2. Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Print initial console logs
    console.log('\n3. Initial console logs:');
    consoleLogs.forEach(log => {
      console.log(`   [${log.type}] ${log.text}`);
    });
    
    // Clear logs for next action
    consoleLogs.length = 0;
    
    // Click Variability tab
    console.log('\n4. Clicking Variability tab...');
    const variabilityButton = await page.$('button:text("Variability")');
    if (variabilityButton) {
      await variabilityButton.click();
      await page.waitForTimeout(3000);
      
      // Print console logs after click
      console.log('\n5. Console logs after clicking Variability:');
      if (consoleLogs.length === 0) {
        console.log('   (No console messages)');
      } else {
        consoleLogs.forEach(log => {
          console.log(`   [${log.type}] ${log.text}`);
          if (log.location.url) {
            console.log(`      at ${log.location.url}:${log.location.lineNumber}`);
          }
        });
      }
      
      // Check for page errors
      console.log('\n6. Page errors:');
      if (pageErrors.length === 0) {
        console.log('   (No page errors)');
      } else {
        pageErrors.forEach(error => {
          console.log(`   ERROR: ${error.message}`);
          if (error.stack) {
            console.log(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n   ')}`);
          }
        });
      }
      
      // Check what's actually rendered
      const rendered = await page.evaluate(() => {
        const firstChart = document.querySelector('.bg-white.rounded-lg.shadow');
        if (!firstChart) return { error: 'No chart container found' };
        
        // Check tab content
        const tabContent = firstChart.querySelector('[role="tabpanel"]');
        const activeTab = firstChart.querySelector('[role="tab"][aria-selected="true"]');
        
        return {
          activeTabText: activeTab?.textContent,
          tabContentExists: !!tabContent,
          tabContentChildren: tabContent ? tabContent.children.length : 0,
          tabContentHTML: tabContent ? tabContent.innerHTML.substring(0, 200) : null,
          hasVariabilityContainer: !!firstChart.querySelector('.variability-chart-container'),
          hasSvg: !!firstChart.querySelector('svg'),
          errorMessages: Array.from(firstChart.querySelectorAll('.error, .warning')).map(el => el.textContent)
        };
      });
      
      console.log('\n7. Rendered content analysis:');
      console.log(`   Active tab: ${rendered.activeTabText}`);
      console.log(`   Tab content exists: ${rendered.tabContentExists}`);
      console.log(`   Tab content children: ${rendered.tabContentChildren}`);
      console.log(`   Has variability container: ${rendered.hasVariabilityContainer}`);
      console.log(`   Has SVG: ${rendered.hasSvg}`);
      if (rendered.errorMessages.length > 0) {
        console.log(`   Error messages: ${rendered.errorMessages.join(', ')}`);
      }
      if (rendered.tabContentHTML) {
        console.log(`   Tab content preview: ${rendered.tabContentHTML}...`);
      }
    }
    
    console.log('\n8. Browser will remain open for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();