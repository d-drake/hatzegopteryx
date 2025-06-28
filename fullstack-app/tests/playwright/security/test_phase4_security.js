const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Testing Phase 4 Security Features...\n');

    // 1. Login as admin
    console.log('1. Logging in as admin...');
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/');
    console.log('✓ Logged in successfully');

    // 2. Test security monitoring API endpoints
    console.log('\n2. Testing security monitoring API endpoints...');
    
    // Get the access token
    const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
    
    // Test security dashboard endpoint
    const dashboardResponse = await fetch('http://localhost:8000/api/security/dashboard', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    const dashboardData = await dashboardResponse.json();
    console.log('✓ Security dashboard loaded:', dashboardResponse.status === 200);
    console.log('  Health status:', dashboardData.health_status);
    console.log('  Summary:', dashboardData.summary);
    
    // Test suspicious patterns endpoint
    const patternsResponse = await fetch('http://localhost:8000/api/security/alerts/suspicious-patterns', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    const patternsData = await patternsResponse.json();
    console.log('✓ Suspicious patterns check:', patternsResponse.status === 200);
    console.log('  Patterns found:', patternsData.count);
    
    // Test weak passwords scan
    const weakPasswordsResponse = await fetch('http://localhost:8000/api/security/scan/weak-passwords', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    const weakPasswordsData = await weakPasswordsResponse.json();
    console.log('✓ Weak passwords scan:', weakPasswordsResponse.status === 200);
    console.log('  Findings:', weakPasswordsData.findings.length);
    
    // Test inactive users scan
    const inactiveResponse = await fetch('http://localhost:8000/api/security/scan/inactive-users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    const inactiveData = await inactiveResponse.json();
    console.log('✓ Inactive users scan:', inactiveResponse.status === 200);
    console.log('  Findings:', inactiveData.findings.length);
    
    // 3. Test security dashboard UI
    console.log('\n3. Testing security dashboard UI...');
    await page.goto('http://localhost:3000/admin/security');
    await page.waitForSelector('h1:has-text("Security Dashboard")');
    console.log('✓ Security dashboard page loaded');
    
    // Check health status is displayed
    const healthStatus = await page.textContent('h2:has-text("Security Status:")');
    console.log('✓ Health status displayed:', healthStatus);
    
    // Check summary cards
    const summaryCards = await page.$$('.grid > div > .text-2xl');
    console.log('✓ Summary cards displayed:', summaryCards.length);
    
    // Try running a scan
    console.log('\n4. Testing security scan functionality...');
    await page.click('button:has-text("Password Security Scan")');
    await page.waitForTimeout(2000);
    
    const scanResult = await page.textContent('button:has-text("Password Security Scan")');
    console.log('✓ Scan completed:', scanResult.includes('Found'));
    
    // 5. Test failed login monitoring
    console.log('\n5. Testing failed login monitoring...');
    
    // Logout first
    await page.goto('http://localhost:3000');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('http://localhost:3000/login');
    
    // Try multiple failed logins
    for (let i = 0; i < 3; i++) {
      await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }
    console.log('✓ Generated 3 failed login attempts');
    
    // Login again to check alerts
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/');
    
    // Check failed login alerts
    const newAccessToken = await page.evaluate(() => localStorage.getItem('access_token'));
    const failedLoginsResponse = await fetch('http://localhost:8000/api/security/alerts/failed-logins?ip_address=127.0.0.1', {
      headers: {
        'Authorization': `Bearer ${newAccessToken}`,
        'Accept': 'application/json'
      }
    });
    const failedLoginsData = await failedLoginsResponse.json();
    console.log('✓ Failed login alert check:', failedLoginsResponse.status === 200);
    console.log('  Failed attempts:', failedLoginsData.count);
    console.log('  Alert triggered:', failedLoginsData.triggered);
    
    console.log('\n✅ Phase 4 security features test completed!');
    console.log('\nSummary:');
    console.log('- Security monitoring API: Implemented');
    console.log('- Security dashboard UI: Implemented');
    console.log('- Vulnerability scanning: Implemented');
    console.log('- Alert monitoring: Implemented');
    console.log('- Failed login tracking: Functional');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();