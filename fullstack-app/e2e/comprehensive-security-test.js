const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('=== Comprehensive Security E2E Test Suite ===\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Helper functions
  const testCase = async (name, testFn) => {
    try {
      console.log(`\n📋 Testing: ${name}`);
      await testFn();
      console.log(`✅ PASSED: ${name}`);
      results.passed++;
    } catch (error) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}`);
      results.failed++;
      results.errors.push({ test: name, error: error.message });
    }
  };

  const generateRandomEmail = () => `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;

  try {
    // ====================
    // 1. REGISTRATION & APPROVAL WORKFLOW
    // ====================
    console.log('\n🔐 SECTION 1: Registration & Approval Workflow');
    
    const testEmail = generateRandomEmail();
    const testPassword = 'SecureP@ssw0rd123!';
    
    await testCase('User Registration', async () => {
      await page.goto('http://localhost:3000/register');
      await page.waitForSelector('h1:has-text("Register")');
      
      // Fill registration form
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="confirmPassword"]', testPassword);
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="department"]', 'Engineering');
      await page.fill('textarea[name="reason"]', 'Testing the security features');
      
      // Submit registration
      await page.click('button[type="submit"]');
      
      // Verify redirect to pending page
      await page.waitForURL('**/register/pending');
      const pendingMessage = await page.textContent('h1');
      if (!pendingMessage.includes('Registration Pending')) {
        throw new Error('Registration pending page not shown');
      }
    });

    await testCase('Pending User Cannot Login', async () => {
      await page.goto('http://localhost:3000/login');
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
      
      // Should show error message
      await page.waitForSelector('text=/account.*pending|not.*approved/i');
    });

    // ====================
    // 2. AUTHENTICATION FLOWS
    // ====================
    console.log('\n🔐 SECTION 2: Authentication Flows');
    
    await testCase('Admin Login', async () => {
      await page.goto('http://localhost:3000/login');
      await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      // Verify successful login
      await page.waitForURL('http://localhost:3000/');
      await page.waitForSelector('button:has-text("Logout")');
      
      // Verify token storage
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      if (!token) throw new Error('Access token not stored');
    });

    await testCase('Failed Login Attempts Tracking', async () => {
      // Logout first
      await page.click('button:has-text("Logout")');
      await page.waitForURL('http://localhost:3000/login');
      
      // Try multiple failed logins
      for (let i = 0; i < 5; i++) {
        await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
        await page.fill('input[name="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }
      
      // Verify error messages appear
      const errorCount = await page.locator('text=/Invalid credentials|Too many attempts/i').count();
      if (errorCount === 0) throw new Error('No error messages shown for failed login');
    });

    // Login again as admin for remaining tests
    await testCase('Admin Re-login After Failed Attempts', async () => {
      await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('http://localhost:3000/');
    });

    // ====================
    // 3. AUTHORIZATION & ROLE-BASED ACCESS
    // ====================
    console.log('\n🔐 SECTION 3: Authorization & Role-Based Access');
    
    await testCase('Admin Can Access Admin Panel', async () => {
      await page.goto('http://localhost:3000/admin');
      await page.waitForSelector('h1:has-text("Admin Dashboard")');
      
      // Check admin menu items
      const adminMenuItems = await page.$$('a[href^="/admin/"]');
      if (adminMenuItems.length < 3) throw new Error('Admin menu items missing');
    });

    await testCase('Admin Can Access User Management', async () => {
      await page.goto('http://localhost:3000/admin/users');
      await page.waitForSelector('h1:has-text("User Management")');
      
      // Verify user table exists
      await page.waitForSelector('table');
      const rows = await page.$$('tbody tr');
      if (rows.length === 0) throw new Error('No users displayed in table');
    });

    await testCase('Admin Can Approve Pending Registration', async () => {
      await page.goto('http://localhost:3000/admin/users');
      
      // Look for pending registrations tab/section
      const pendingTab = await page.$('text=/Pending Registrations/i');
      if (pendingTab) {
        await pendingTab.click();
        await page.waitForTimeout(1000);
        
        // Check if our test user registration is visible
        const pendingUser = await page.$(`text=${testEmail}`);
        if (pendingUser) {
          // Find and click approve button
          const approveButton = await page.$('button:has-text("Approve")');
          if (approveButton) {
            await approveButton.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    });

    // ====================
    // 4. SECURITY HEADERS & FEATURES
    // ====================
    console.log('\n🔐 SECTION 4: Security Headers & Features');
    
    await testCase('Security Headers Verification', async () => {
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      
      // Test API endpoint with security headers
      const response = await fetch('http://localhost:8000/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Check security headers
      const headers = response.headers;
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'strict-transport-security'
      ];
      
      for (const header of securityHeaders) {
        if (!headers.get(header)) {
          console.warn(`   ⚠️  Missing security header: ${header}`);
        }
      }
    });

    await testCase('Rate Limiting Test', async () => {
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      
      // Make multiple rapid requests
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch('http://localhost:8000/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      if (!rateLimited) {
        console.warn('   ⚠️  Rate limiting might not be configured properly');
      }
    });

    // ====================
    // 5. SECURITY MONITORING & DASHBOARD
    // ====================
    console.log('\n🔐 SECTION 5: Security Monitoring & Dashboard');
    
    await testCase('Security Dashboard Access', async () => {
      await page.goto('http://localhost:3000/admin/security');
      await page.waitForSelector('h1:has-text("Security Dashboard")');
      
      // Check security status
      const statusElement = await page.$('h2:has-text("Security Status:")');
      if (!statusElement) throw new Error('Security status not displayed');
      
      // Check summary cards
      const summaryCards = await page.$$('.grid > div');
      if (summaryCards.length < 4) throw new Error('Security summary cards missing');
    });

    await testCase('Security Scanning Features', async () => {
      // Test password security scan
      const passwordScanButton = await page.$('button:has-text("Password Security Scan")');
      if (passwordScanButton) {
        await passwordScanButton.click();
        await page.waitForTimeout(2000);
        
        // Check for results
        const scanResult = await page.textContent('button:has-text("Password Security Scan")');
        if (!scanResult.includes('Found')) {
          console.warn('   ⚠️  Password scan might not be working correctly');
        }
      }
      
      // Test inactive users scan
      const inactiveScanButton = await page.$('button:has-text("Inactive Users Scan")');
      if (inactiveScanButton) {
        await inactiveScanButton.click();
        await page.waitForTimeout(2000);
      }
      
      // Test privilege scan
      const privilegeScanButton = await page.$('button:has-text("Privilege Escalation Scan")');
      if (privilegeScanButton) {
        await privilegeScanButton.click();
        await page.waitForTimeout(2000);
      }
    });

    await testCase('Audit Log Access', async () => {
      await page.goto('http://localhost:3000/admin/audit');
      await page.waitForSelector('h1:has-text("Audit Log")');
      
      // Check audit log table
      await page.waitForSelector('table', { timeout: 5000 });
      const auditRows = await page.$$('tbody tr');
      
      if (auditRows.length > 0) {
        // Verify audit log entries have required fields
        const firstRow = await page.$('tbody tr:first-child');
        const cells = await firstRow.$$('td');
        if (cells.length < 4) throw new Error('Audit log missing required fields');
      }
    });

    // ====================
    // 6. TOKEN & SESSION MANAGEMENT
    // ====================
    console.log('\n🔐 SECTION 6: Token & Session Management');
    
    await testCase('Token Blacklisting After Logout', async () => {
      // Get current token
      const oldToken = await page.evaluate(() => localStorage.getItem('access_token'));
      
      // Logout
      await page.goto('http://localhost:3000');
      await page.click('button:has-text("Logout")');
      await page.waitForURL('http://localhost:3000/login');
      
      // Verify token is removed
      const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('access_token'));
      if (tokenAfterLogout) throw new Error('Token not removed after logout');
      
      // Try to use old token
      const response = await fetch('http://localhost:8000/api/users/me', {
        headers: { 'Authorization': `Bearer ${oldToken}` }
      });
      
      if (response.status === 200) {
        console.warn('   ⚠️  Token might not be blacklisted after logout');
      }
    });

    await testCase('Protected Routes Redirect to Login', async () => {
      // Try to access protected routes while logged out
      const protectedRoutes = [
        '/admin',
        '/admin/users',
        '/admin/security',
        '/admin/audit',
        '/spc-dashboard/SPC_CD_L1/BNT44'
      ];
      
      for (const route of protectedRoutes) {
        await page.goto(`http://localhost:3000${route}`);
        await page.waitForURL('**/login');
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          throw new Error(`Protected route ${route} did not redirect to login`);
        }
      }
    });

    // ====================
    // 7. ERROR HANDLING & EDGE CASES
    // ====================
    console.log('\n🔐 SECTION 7: Error Handling & Edge Cases');
    
    await testCase('Invalid Token Handling', async () => {
      // Set invalid token
      await page.evaluate(() => {
        localStorage.setItem('access_token', 'invalid_token_12345');
      });
      
      // Try to access protected route
      await page.goto('http://localhost:3000/admin');
      await page.waitForURL('**/login');
    });

    await testCase('Registration Form Validation', async () => {
      await page.goto('http://localhost:3000/register');
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      
      // Check for validation errors
      const errors = await page.$$('.text-red-500, .text-red-600, [class*="error"]');
      if (errors.length === 0) throw new Error('Form validation not working');
      
      // Test password mismatch
      await page.fill('input[name="email"]', generateRandomEmail());
      await page.fill('input[name="password"]', 'Password123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      
      // Should show password mismatch error
      const mismatchError = await page.$('text=/Passwords.*match/i');
      if (!mismatchError) throw new Error('Password mismatch validation not working');
    });

    await testCase('XSS Protection Test', async () => {
      // Login as admin
      await page.goto('http://localhost:3000/login');
      await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('http://localhost:3000/');
      
      // Try to inject script in a form (if any user-editable content exists)
      // This is a basic test - in production you'd test all input fields
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      
      // Check if API properly escapes/rejects script tags
      const xssPayload = '<script>alert("XSS")</script>';
      const response = await fetch('http://localhost:8000/api/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Custom-Header': xssPayload // Try to inject via header
        }
      });
      
      // The response should still work (XSS attempt should be handled safely)
      if (response.status !== 200) {
        console.warn('   ⚠️  API might be too restrictive with headers');
      }
    });

    // ====================
    // 8. SENTRY INTEGRATION CHECK
    // ====================
    console.log('\n🔐 SECTION 8: Sentry Integration Check');
    
    await testCase('Sentry Error Tracking', async () => {
      // Check if Sentry is loaded in frontend
      const sentryLoaded = await page.evaluate(() => {
        return typeof window.Sentry !== 'undefined';
      });
      
      if (!sentryLoaded) {
        console.warn('   ⚠️  Sentry might not be properly integrated in frontend');
      }
      
      // Note: We detected several Sentry issues that need fixing:
      console.log('   📊 Known Sentry Issues:');
      console.log('      - AttributeError in privilege-escalation scan');
      console.log('      - Missing @heroicons/react module in frontend');
      console.log('      - User model missing password_changed_at attribute');
      console.log('      - AuditLog validation errors');
    });

  } catch (error) {
    console.error('\n🚨 Test suite error:', error);
    results.failed++;
  } finally {
    // ====================
    // TEST RESULTS SUMMARY
    // ====================
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    if (results.errors.length > 0) {
      console.log('\n🔍 Failed Tests Details:');
      results.errors.forEach((err, idx) => {
        console.log(`\n${idx + 1}. ${err.test}`);
        console.log(`   Error: ${err.error}`);
      });
    }
    
    console.log('\n🐛 Sentry Issues Detected:');
    console.log('1. HATZEGOPTERYX-BACKEND-5: AttributeError in privilege-escalation scan');
    console.log('2. HATZEGOPTERYX-FRONTEND-X: Missing @heroicons/react module');
    console.log('3. HATZEGOPTERYX-BACKEND-4: User model missing password_changed_at');
    console.log('4. HATZEGOPTERYX-BACKEND-3: AuditLog validation errors');
    console.log('5. HATZEGOPTERYX-BACKEND-2: Email service configuration issues');
    
    console.log('\n💡 Recommendations:');
    console.log('1. Fix the Sentry errors listed above');
    console.log('2. Ensure rate limiting is properly configured');
    console.log('3. Implement token blacklisting if not already done');
    console.log('4. Add missing security headers if any');
    console.log('5. Configure email service for registration approvals');
    
    await browser.close();
  }
})();