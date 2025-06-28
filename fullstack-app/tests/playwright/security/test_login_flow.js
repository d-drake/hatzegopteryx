const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Testing login flow...\n');

    // Go to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    console.log('✓ Login page loaded');
    
    // Fill in credentials
    console.log('\n2. Filling in credentials...');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    console.log('✓ Credentials entered');
    
    // Submit form
    console.log('\n3. Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for response
    console.log('\n4. Waiting for login response...');
    
    // Try to wait for navigation, with a timeout
    try {
      await page.waitForURL('http://localhost:3000/', { timeout: 5000 });
      console.log('✓ Successfully redirected to home page');
      
      // Check if we have the welcome message
      const welcomeText = await page.textContent('h1');
      console.log('Page heading:', welcomeText);
      
      // Check if admin link is visible
      const hasAdminLink = await page.isVisible('a[href="/admin"]');
      console.log('Admin link visible:', hasAdminLink);
      
    } catch (error) {
      console.log('✗ Login navigation failed');
      
      // Check current URL
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      // Look for any error messages
      const bodyText = await page.textContent('body');
      if (bodyText.includes('Incorrect')) {
        console.log('Error: Incorrect credentials message found');
      }
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'login-failed.png' });
      console.log('Screenshot saved as login-failed.png');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();