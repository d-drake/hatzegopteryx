const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Testing simple login...\n');

    // Check if superuser exists
    console.log('1. Checking if we can access the login page...');
    await page.goto('http://localhost:3000/login');
    console.log('✓ Login page loaded');
    
    // Try to login
    console.log('\n2. Attempting login...');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    
    // Take a screenshot before submitting
    await page.screenshot({ path: 'login-before.png' });
    
    await page.click('button[type="submit"]');
    
    // Wait and check result
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // Take a screenshot after submitting
    await page.screenshot({ path: 'login-after.png' });
    
    // Check page content
    const pageContent = await page.content();
    if (pageContent.includes('Welcome')) {
      console.log('✓ Login appears successful');
    } else if (pageContent.includes('Invalid')) {
      console.log('✗ Login failed: Invalid credentials');
    } else {
      console.log('? Unknown state');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();