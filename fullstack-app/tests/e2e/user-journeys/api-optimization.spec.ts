import { test, expect } from '@playwright/test';

test.describe('API Optimization Tests', () => {
  test('should fetch CD data only once for SPC Dashboard', async ({ page }) => {
    const cdDataRequests: string[] = [];
    const spcLimitsRequests: string[] = [];
    
    // Monitor API requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/cd-data/') && !url.includes('/api/cd-data/process-product-combinations')) {
        if (url.includes('spc-limits')) {
          spcLimitsRequests.push(url);
          console.log(`SPC Limits request #${spcLimitsRequests.length}: ${url}`);
        } else {
          cdDataRequests.push(url);
          console.log(`CD Data request #${cdDataRequests.length}: ${url}`);
        }
      }
    });

    // Navigate to SPC Dashboard
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('svg', { timeout: 10000 });
    
    // Wait a bit more to ensure all requests are captured
    await page.waitForTimeout(2000);
    
    // Log results
    console.log(`\nAPI Request Summary:`);
    console.log(`CD Data requests: ${cdDataRequests.length}`);
    console.log(`SPC Limits requests: ${spcLimitsRequests.length}`);
    
    // In production, CD data should be fetched only once
    // In development with React StrictMode, it might be fetched twice
    expect(cdDataRequests.length).toBeLessThanOrEqual(2);
    console.log('✅ CD Data fetch optimization: PASSED');
    
    // SPC Limits should ideally be fetched once per context
    // With our fix, it should be significantly reduced from the N+1 pattern
    expect(spcLimitsRequests.length).toBeLessThanOrEqual(4); // Allow for StrictMode doubling
    console.log('✅ SPC Limits fetch optimization: PASSED');
  });

  test('should maintain single CD data fetch when using filters', async ({ page }) => {
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForLoadState('networkidle');
    
    const cdDataRequests: string[] = [];
    
    // Start monitoring after initial load
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/cd-data/') && 
          !url.includes('spc-limits') && 
          !url.includes('process-product-combinations')) {
        cdDataRequests.push(url);
      }
    });
    
    // Change entity filter
    await page.selectOption('select', 'FAKE_TOOL2');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Should have made exactly one new request for the filter change
    expect(cdDataRequests.length).toBe(1);
    console.log('✅ Filter change triggers single CD data fetch: PASSED');
  });

  test('should batch API calls efficiently on page navigation', async ({ page }) => {
    const apiCallsByType = {
      cdData: 0,
      spcLimits: 0,
      processProductCombos: 0
    };
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/cd-data/')) {
        if (url.includes('spc-limits')) {
          apiCallsByType.spcLimits++;
        } else if (url.includes('process-product-combinations')) {
          apiCallsByType.processProductCombos++;
        } else {
          apiCallsByType.cdData++;
        }
      }
    });
    
    // Navigate between different process-product combinations
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForLoadState('networkidle');
    
    const initialCalls = { ...apiCallsByType };
    
    // Navigate to a different combination
    await page.click('button:has-text("1100 VLQR1")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Calculate new calls made
    const newCalls = {
      cdData: apiCallsByType.cdData - initialCalls.cdData,
      spcLimits: apiCallsByType.spcLimits - initialCalls.spcLimits,
      processProductCombos: apiCallsByType.processProductCombos - initialCalls.processProductCombos
    };
    
    console.log('\nAPI calls for navigation:');
    console.log(`CD Data: ${newCalls.cdData}`);
    console.log(`SPC Limits: ${newCalls.spcLimits}`);
    console.log(`Process-Product Combos: ${newCalls.processProductCombos}`);
    
    // Should fetch new data efficiently
    expect(newCalls.cdData).toBeLessThanOrEqual(2); // Allow for StrictMode
    expect(newCalls.spcLimits).toBeLessThanOrEqual(4); // Allow for StrictMode
    expect(newCalls.processProductCombos).toBe(0); // Should not refetch combos
  });
});