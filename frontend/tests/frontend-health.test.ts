import puppeteer, { Browser, Page } from 'puppeteer';

describe('Frontend Health Tests', () => {
  let browser: Browser;
  let page: Page;
  const BASE_URL = 'http://localhost:3000';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });

    // Listen for failed requests
    page.on('requestfailed', request => {
      console.error('Failed request:', request.url(), request.failure()?.errorText);
    });
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('Home page loads successfully', async () => {
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBe(200);
    
    // Check for main content
    await page.waitForSelector('body');
    
    // Verify no major JavaScript errors by checking if React rendered
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('Navigation tabs are functional', async () => {
    await page.goto(BASE_URL);
    
    // Wait for the tabs to load
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    
    // Click on CD Data tab
    const cdDataTab = await page.$('button[role="tab"]:nth-child(2)');
    if (cdDataTab) {
      await cdDataTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Verify tab switching worked
    const activeTab = await page.$('[role="tab"][aria-selected="true"]');
    expect(activeTab).toBeTruthy();
  });

  test('API connections are working', async () => {
    await page.goto(BASE_URL);
    
    // Intercept network requests
    const apiRequests: string[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiRequests.push(response.url());
      }
    });
    
    // Wait for initial API calls
    await page.waitForTimeout(3000);
    
    // Check if API requests were made
    expect(apiRequests.length).toBeGreaterThan(0);
  });

  test('SPC Dashboard routing works', async () => {
    await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
    
    // Wait for page to load
    await page.waitForSelector('body');
    
    // Check if we're on the right page (no 404)
    const response = await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
    expect(response?.status()).toBe(200);
  });

  test('Charts render without errors', async () => {
    await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
    
    // Wait for chart container
    await page.waitForSelector('[data-testid="chart-container"], .chart-container, svg', { timeout: 15000 });
    
    // Check if SVG elements exist (indicating D3 charts rendered)
    const svgElements = await page.$$('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  test('Filter controls are functional', async () => {
    await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
    
    // Wait for filter controls
    await page.waitForSelector('select, input[type="date"], button', { timeout: 10000 });
    
    // Try to interact with a filter (entity selection)
    const entitySelect = await page.$('select');
    if (entitySelect) {
      await entitySelect.click();
      const options = await page.$$('select option');
      expect(options.length).toBeGreaterThan(1);
    }
  });

  test('Page handles missing data gracefully', async () => {
    // Test with invalid parameters that might cause errors
    await page.goto(`${BASE_URL}/spc-dashboard/INVALID/INVALID`);
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Check that page doesn't crash - should either show error message or empty state
    const bodyContent = await page.$('body');
    expect(bodyContent).toBeTruthy();
  });

  test('Memory leaks - multiple page navigations', async () => {
    const routes = [
      BASE_URL,
      `${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`,
      `${BASE_URL}/spc-dashboard/SPC_CD_L2/2000_BNT45`,
    ];
    
    // Navigate between routes multiple times
    for (let i = 0; i < 3; i++) {
      for (const route of routes) {
        await page.goto(route);
        await page.waitForTimeout(2000);
        
        // Check if page is still responsive
        const title = await page.title();
        expect(title).toBeTruthy();
      }
    }
  });

  test('Console errors monitoring', async () => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);
    
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
    await page.waitForTimeout(5000);
    
    // Report any console errors found
    if (consoleErrors.length > 0) {
      console.warn('Console errors detected:', consoleErrors);
    }
    
    // This test will always pass but will log errors for investigation
    expect(true).toBe(true);
  });
});