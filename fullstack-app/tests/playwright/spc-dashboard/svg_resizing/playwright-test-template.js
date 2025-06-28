const { chromium } = require('playwright');

/**
 * Standard Playwright test template with headless mode
 * 
 * Usage:
 * - Copy this template for new tests
 * - Headless mode is enabled by default for CI/automation
 * - Set headless: false only when you need to debug visually
 */

(async () => {
  // Launch browser in headless mode
  const browser = await chromium.launch({ 
    headless: true,  // Set to false only for debugging
    // slowMo: 50,   // Uncomment to slow down actions for debugging
  });
  
  const page = await browser.newPage();
  
  try {
    // Set viewport size for consistent testing
    await page.setViewportSize({ width: 800, height: 600 });
    
    // Navigate to page
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Wait for content to load
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(1000); // Wait for animations
    
    // ========================================
    // Add your test logic here
    // ========================================
    
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take screenshot on failure for debugging
    await page.screenshot({ 
      path: `tests/error-${Date.now()}.png`,
      fullPage: true 
    });
    
    throw error;
  } finally {
    await browser.close();
  }
})();