import { test, expect } from '@playwright/test';

test.describe('Security - User Management', () => {
  test('should handle user registration workflow', async ({ page }) => {
    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;
    const email = `test_${timestamp}@example.com`;
    
    // Register new user
    await page.goto('/register');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Should show pending approval
    await expect(page.locator('text=pending approval')).toBeVisible();
    
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Go to registration requests
    await page.goto('/admin/registrations');
    
    // Should see the pending user
    await expect(page.locator(`text=${username}`)).toBeVisible();
    await expect(page.locator(`text=${email}`)).toBeVisible();
  });

  test('should allow admin to approve registrations', async ({ page }) => {
    const timestamp = Date.now();
    const username = `approveuser_${timestamp}`;
    const email = `approve_${timestamp}@example.com`;
    
    // Register new user
    await page.goto('/register');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'ApprovePass123!');
    await page.click('button[type="submit"]');
    
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Go to registration requests
    await page.goto('/admin/registrations');
    
    // Find and approve the user
    const userRow = page.locator('tr', { hasText: email });
    await userRow.locator('button:has-text("Approve")').click();
    
    // User should disappear from pending list
    await expect(page.locator(`text=${email}`)).not.toBeVisible();
  });

  test('should allow admin to manage users', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Go to user management
    await page.goto('/admin/users');
    
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
    
    // Should see admin user
    await expect(page.locator('text=admin@hatzegopteryx.com')).toBeVisible();
    
    // Check user details are visible
    await expect(page.locator('text=Active')).toBeVisible();
    await expect(page.locator('text=Superuser')).toBeVisible();
  });

  test('should enforce password requirements', async ({ page }) => {
    await page.goto('/register');
    
    // Try weak password
    await page.fill('input[name="username"]', 'weakpassuser');
    await page.fill('input[name="email"]', 'weak@example.com');
    await page.fill('input[name="password"]', '123'); // Too short
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should prevent duplicate email registration', async ({ page }) => {
    await page.goto('/register');
    
    // Try to register with existing email
    await page.fill('input[name="username"]', 'duplicateuser');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'DuplicatePass123!');
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator('text=already registered')).toBeVisible();
  });
});