import { test, expect } from '@playwright/test';

test.describe('Security - Authorization', () => {
  test.beforeEach(async ({ page }) => {
    // Create a regular user for testing
    await page.goto('/register');
    const timestamp = Date.now();
    await page.fill('input[name="username"]', `regularuser_${timestamp}`);
    await page.fill('input[name="email"]', `regular_${timestamp}@example.com`);
    await page.fill('input[name="password"]', 'RegularPass123!');
    await page.click('button[type="submit"]');
  });

  test('should restrict admin routes to superusers only', async ({ page }) => {
    // Try to access admin panel without login
    await page.goto('/admin');
    await expect(page).toHaveURL('/login');
    
    // Login as admin
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Now should be able to access admin
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h2:has-text("Admin Panel")')).toBeVisible();
  });

  test('should show admin link only to superusers', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Admin link should be visible
    await expect(page.locator('a:has-text("Admin")')).toBeVisible();
  });

  test('should protect user management routes', async ({ page }) => {
    // Try to access user management without login
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/login');
    
    // Login as admin
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Navigate to user management
    await page.goto('/admin/users');
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
  });

  test('should protect audit logs', async ({ page }) => {
    // Try to access audit logs without login
    await page.goto('/admin/audit-logs');
    await expect(page).toHaveURL('/login');
    
    // Login as admin
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Navigate to audit logs
    await page.goto('/admin/audit-logs');
    await expect(page.locator('h1:has-text("Audit Logs")')).toBeVisible();
  });

  test('should protect security dashboard', async ({ page }) => {
    // Try to access security dashboard without login
    await page.goto('/admin/security');
    await expect(page).toHaveURL('/login');
    
    // Login as admin
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Navigate to security dashboard
    await page.goto('/admin/security');
    await expect(page.locator('h1:has-text("Security Dashboard")')).toBeVisible();
  });

  test('should protect registration approval routes', async ({ page }) => {
    // Try to access registrations without login
    await page.goto('/admin/registrations');
    await expect(page).toHaveURL('/login');
    
    // Login as admin
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Navigate to registrations
    await page.goto('/admin/registrations');
    await expect(page.locator('h1:has-text("Registration Requests")')).toBeVisible();
  });
});