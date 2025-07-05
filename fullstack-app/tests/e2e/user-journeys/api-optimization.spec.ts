import { test, expect } from '@playwright/test';

test.describe('API Optimization Tests', () => {
  test('should fetch CD data only once for SPC Dashboard', async ({ page }) => {
    const cdDataRequests: string[] = [];
    const spcLimitsRequests: string[] = [];
    
    // Monitor API requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/spc-cd-l1/') && !url.includes('/api/spc-cd-l1/process-product-combinations')) {
        if (url.includes('spc-limits')) {
          spcLimitsRequests.push(url);
          console.log(`SPC Limits request #${spcLimitsRequests.length}: ${url}`);
        } else {
          cdDataRequests.push(url);
          console.log(`SPC CD L1 data request #${cdDataRequests.length}: ${url}`);
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
    console.log(`SPC CD L1 data requests: ${cdDataRequests.length}`);
    console.log(`SPC Limits requests: ${spcLimitsRequests.length}`);
    
    // In production, SPC CD L1 data should be fetched only once
    // In development with React StrictMode, it might be fetched twice
    expect(cdDataRequests.length).toBeLessThanOrEqual(2);
    console.log('✅ SPC CD L1 data fetch optimization: PASSED');
    
    // SPC Limits should ideally be fetched once per context
    // With our fix, it should be significantly reduced from the N+1 pattern
    expect(spcLimitsRequests.length).toBeLessThanOrEqual(4); // Allow for StrictMode doubling
    console.log('✅ SPC Limits fetch optimization: PASSED');
  });

  test('should maintain single SPC CD L1 data fetch when using filters', async ({ page }) => {
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForLoadState('networkidle');
    
    const cdDataRequests: string[] = [];
    
    // Start monitoring after initial load
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/spc-cd-l1/') && 
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
    console.log('✅ Filter change triggers single SPC CD L1 data fetch: PASSED');
  });

  test('should batch API calls efficiently on page navigation', async ({ page }) => {
    const apiCallsByType = {
      spcCdL1Data: 0,
      spcLimits: 0,
      processProductCombos: 0
    };
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/spc-cd-l1/')) {
        if (url.includes('spc-limits')) {
          apiCallsByType.spcLimits++;
        } else if (url.includes('process-product-combinations')) {
          apiCallsByType.processProductCombos++;
        } else {
          apiCallsByType.spcCdL1Data++;
        }
      }
    });
    
    // Navigate between different process-product combinations
    await page.goto('/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForLoadState('networkidle');
    
    const initialCalls = { ...apiCallsByType };
    
    // Navigate to a different combination
    await page.click('button:has-text("1100 BNT44")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Calculate new calls made
    const newCalls = {
      spcCdL1Data: apiCallsByType.spcCdL1Data - initialCalls.spcCdL1Data,
      spcLimits: apiCallsByType.spcLimits - initialCalls.spcLimits,
      processProductCombos: apiCallsByType.processProductCombos - initialCalls.processProductCombos
    };
    
    console.log('\nAPI calls for navigation:');
    console.log(`SPC CD L1 Data: ${newCalls.spcCdL1Data}`);
    console.log(`SPC Limits: ${newCalls.spcLimits}`);
    console.log(`Process-Product Combos: ${newCalls.processProductCombos}`);
    
    // Should fetch new data efficiently
    expect(newCalls.spcCdL1Data).toBeLessThanOrEqual(2); // Allow for StrictMode
    expect(newCalls.spcLimits).toBeLessThanOrEqual(4); // Allow for StrictMode
    expect(newCalls.processProductCombos).toBe(0); // Should not refetch combos
  });
});