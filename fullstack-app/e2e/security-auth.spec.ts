import { test, expect } from '@playwright/test';

test.describe('Security - Authentication', () => {
  test('should allow user registration', async ({ page }) => {
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('input[name="username"]', 'testuser_' + Date.now());
    await page.fill('input[name="email"]', `testuser_${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TestPass123!@#');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show pending approval message
    await expect(page.locator('text=pending approval')).toBeVisible();
  });

  test('should handle login with correct credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
    
    // Should show username in header
    await expect(page.locator('text=admin')).toBeVisible();
  });

  test('should handle login with incorrect credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
    
    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('should handle logout correctly', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Get the access token
    const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(tokenBefore).toBeTruthy();
    
    // Logout
    await page.click('button:has-text("Logout")');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
    
    // Token should be cleared
    const tokenAfter = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(tokenAfter).toBeNull();
  });

  test('should enforce token blacklisting after logout', async ({ page, request }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Get the access token
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    
    // Verify token works before logout
    const responseBefore = await request.get('http://localhost:8000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(responseBefore.ok()).toBeTruthy();
    
    // Logout
    await page.click('button:has-text("Logout")');
    
    // Try to use the same token after logout
    const responseAfter = await request.get('http://localhost:8000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(responseAfter.status()).toBe(401);
  });

  test('should handle session timeout gracefully', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@hatzegopteryx.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Clear the token to simulate session timeout
    await page.evaluate(() => localStorage.removeItem('access_token'));
    
    // Try to access protected route
    await page.goto('/admin');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});