import { test, expect } from '@playwright/test';

test.describe('Security - Monitoring and Scanning', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    // Login as admin to get token
    const loginResponse = await request.post('http://localhost:8000/api/auth/login', {
      form: {
        username: 'admin@hatzegopteryx.com',
        password: 'admin123'
      }
    });
    const tokens = await loginResponse.json();
    adminToken = tokens.access_token;
  });

  test('should access security dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin/security');
    
    // Check dashboard elements
    await expect(page.locator('h1:has-text("Security Dashboard")')).toBeVisible();
    await expect(page.locator('text=Security Status:')).toBeVisible();
    
    // Check summary cards
    await expect(page.locator('text=Privilege Alerts')).toBeVisible();
    await expect(page.locator('text=Suspicious Patterns')).toBeVisible();
    await expect(page.locator('text=Weak Passwords')).toBeVisible();
    await expect(page.locator('text=Inactive Users')).toBeVisible();
    await expect(page.locator('text=Alerts Today')).toBeVisible();
  });

  test('should run password security scan', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin/security');
    
    // Run password scan
    await page.click('button:has-text("Password Security Scan")');
    
    // Wait for scan to complete
    await page.waitForTimeout(2000);
    
    // Check for results
    await expect(page.locator('text=Found 0 issues')).toBeVisible();
    await expect(page.locator('text=weak passwords Results')).toBeVisible();
  });

  test('should run inactive users scan', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin/security');
    
    // Run inactive users scan
    await page.click('button:has-text("Inactive Users Scan")');
    
    // Wait for scan to complete
    await page.waitForTimeout(2000);
    
    // Check for results
    await expect(page.locator('text=Found 0 users')).toBeVisible();
    await expect(page.locator('text=inactive users Results')).toBeVisible();
  });

  test('should track audit logs', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Navigate to audit logs
    await page.goto('/admin/audit-logs');
    
    await expect(page.locator('h1:has-text("Audit Logs")')).toBeVisible();
    
    // Check filters
    await expect(page.locator('select:has-text("All Actions")')).toBeVisible();
    await expect(page.locator('select:has-text("All Statuses")')).toBeVisible();
  });

  test('should detect failed login attempts via API', async ({ request }) => {
    // Generate some failed login attempts
    for (let i = 0; i < 3; i++) {
      await request.post('http://localhost:8000/api/auth/login', {
        form: {
          username: 'admin@hatzegopteryx.com',
          password: 'wrongpassword'
        }
      });
    }
    
    // Check failed login monitoring
    const response = await request.get('http://localhost:8000/api/security/alerts/failed-logins', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.count).toBeGreaterThanOrEqual(3);
  });

  test('should check suspicious patterns', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/security/alerts/suspicious-patterns', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('patterns');
    expect(data).toHaveProperty('count');
  });
});