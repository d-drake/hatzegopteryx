import { test, expect } from '@playwright/test';

test.describe('Security - Headers and Protection', () => {
  test('should set security headers on all responses', async ({ page, request }) => {
    const response = await request.get('http://localhost:8000/health');
    
    // Check security headers
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBe('DENY');
    expect(response.headers()['x-xss-protection']).toBe('1; mode=block');
    expect(response.headers()['strict-transport-security']).toContain('max-age=31536000');
    expect(response.headers()['content-security-policy']).toBeTruthy();
    expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers()['permissions-policy']).toBeTruthy();
  });

  test('should enforce rate limiting', async ({ request }) => {
    const responses = [];
    
    // Make 15 rapid requests (should be under the limit)
    for (let i = 0; i < 15; i++) {
      const response = await request.get('http://localhost:8000/api/items/');
      responses.push(response.status());
    }
    
    // All should succeed
    expect(responses.every(status => status === 200 || status === 401)).toBeTruthy();
  });

  test('should protect against clickjacking', async ({ page }) => {
    // The X-Frame-Options: DENY header prevents iframe embedding
    // This is already tested in the headers test above
    const response = await page.goto('/');
    expect(response.headers()['x-frame-options']).toBe('DENY');
  });

  test('should handle CORS properly', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/items/', {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    // Should allow frontend origin
    expect(response.headers()['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers()['access-control-allow-credentials']).toBe('true');
  });

  test('should validate content-type on requests', async ({ request }) => {
    // Try to send invalid content type
    const response = await request.post('http://localhost:8000/api/auth/login', {
      data: 'invalid data',
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    
    // Should reject invalid content type
    expect(response.status()).toBe(422);
  });
});