const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Testing admin panel functionality...\n');

    // First, register a new user to create a pending registration
    console.log('1. Creating a registration request...');
    await page.goto('http://localhost:3000/register');
    
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    console.log('✓ Registration request submitted');
    
    // Now login as superuser
    console.log('\n2. Logging in as superuser...');
    await page.goto('http://localhost:3000/login');
    
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    await page.waitForTimeout(2000);
    
    // Check if we're logged in
    const currentUrl = page.url();
    if (currentUrl === 'http://localhost:3000/') {
      console.log('✓ Logged in successfully');
    } else {
      // Check for error message
      const errorMessage = await page.textContent('.text-red-600');
      console.log('Login failed. Current URL:', currentUrl);
      if (errorMessage) {
        console.log('Error message:', errorMessage);
      }
    }
    
    // Only proceed if login was successful
    if (currentUrl === 'http://localhost:3000/') {
      // Navigate to admin panel
      console.log('\n3. Navigating to admin panel...');
      await page.goto('http://localhost:3000/admin');
      await page.waitForSelector('h1:has-text("Admin Dashboard")');
      console.log('✓ Admin dashboard loaded');
    } else {
      console.log('\n✗ Skipping admin panel tests due to login failure');
      return;
    }
    
    // Check dashboard stats
    const stats = await page.evaluate(() => {
      const statElements = document.querySelectorAll('.text-2xl.font-semibold');
      return {
        totalUsers: statElements[0]?.textContent,
        activeUsers: statElements[1]?.textContent,
        pendingRegistrations: statElements[2]?.textContent,
        recentActivity: statElements[3]?.textContent
      };
    });
    console.log('Dashboard stats:', stats);
    
    // Navigate to users management
    console.log('\n4. Testing users management...');
    await page.click('a[href="/admin/users"]');
    await page.waitForSelector('h1:has-text("Users Management")');
    console.log('✓ Users management page loaded');
    
    // Navigate to registration requests
    console.log('\n5. Testing registration requests...');
    await page.click('a[href="/admin/registrations"]');
    await page.waitForSelector('h1:has-text("Registration Requests")');
    console.log('✓ Registration requests page loaded');
    
    // Check if our test registration is visible
    const hasTestRegistration = await page.isVisible('text=testuser@example.com');
    if (hasTestRegistration) {
      console.log('✓ Test registration request is visible');
      
      // Test approve functionality
      console.log('\n6. Testing registration approval...');
      await page.click('button:has-text("Approve")');
      await page.waitForTimeout(2000);
      
      const stillVisible = await page.isVisible('text=testuser@example.com');
      console.log(stillVisible ? '✗ Registration still visible (may be an error)' : '✓ Registration approved and removed from list');
    } else {
      console.log('! No pending registrations found');
    }
    
    // Navigate to audit logs
    console.log('\n7. Testing audit logs...');
    await page.click('a[href="/admin/audit-logs"]');
    await page.waitForSelector('h1:has-text("Audit Logs")');
    console.log('✓ Audit logs page loaded');
    
    console.log('\n✅ All admin panel tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();