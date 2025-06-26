const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,  // Show browser to see what's happening
    slowMo: 100 
  });
  
  try {
    console.log('Opening browser to manually trigger zoom...');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    
    console.log('Page loaded. Please manually zoom on the chart to see where controls appear.');
    console.log('The browser will stay open for 30 seconds...');
    
    // Keep browser open for manual interaction
    await page.waitForTimeout(30000);
    
    await page.close();
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();