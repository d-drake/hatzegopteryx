const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Testing Security Endpoints...\n');

    // 1. Login as admin
    console.log('1. Logging in as admin...');
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/');
    console.log('✓ Logged in successfully');

    // Get the access token
    const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
    console.log('✓ Got access token');

    // 2. Test each endpoint separately
    console.log('\n2. Testing endpoints individually...');
    
    try {
      // Test dashboard
      console.log('\nTesting /api/security/dashboard...');
      const dashboardResponse = await page.evaluate(async (token) => {
        const response = await fetch('http://localhost:8000/api/security/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        const text = await response.text();
        return {
          status: response.status,
          statusText: response.statusText,
          text: text.substring(0, 200) // First 200 chars
        };
      }, accessToken);
      console.log('Dashboard response:', dashboardResponse);
    } catch (error) {
      console.error('Dashboard error:', error.message);
    }

    // Navigate to security page
    console.log('\n3. Testing security dashboard UI...');
    await page.goto('http://localhost:3000/admin/security');
    
    // Wait for page to load
    const pageTitle = await page.textContent('h1');
    console.log('Page title:', pageTitle);
    
    // Check if there's an error on the page
    const errorElement = await page.$('.text-red-500');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      console.log('Error on page:', errorText);
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: '~/tmp/tests/playwright_png/security_dashboard_debug.png' });
    console.log('Screenshot saved to ~/tmp/tests/playwright_png/security_dashboard_debug.png');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();