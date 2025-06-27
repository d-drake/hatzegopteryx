import { Page, expect } from '@playwright/test';

/**
 * Wait for the SPC dashboard to fully load
 */
export async function waitForSPCDashboard(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('svg.timeline-chart', { timeout: 10000 });
  await page.waitForSelector('.legend', { timeout: 5000 });
}

/**
 * Navigate to a specific SPC monitor and product combination
 */
export async function navigateToSPCDashboard(
  page: Page,
  spcMonitor: string = 'SPC_CD_L1',
  processType: string = '1000',
  productType: string = 'BNT44'
) {
  await page.goto(`/spc-dashboard/${spcMonitor}/${processType}-${productType}`);
  await waitForSPCDashboard(page);
}

/**
 * Get all visible data points in the chart
 */
export async function getDataPoints(page: Page) {
  return page.locator('circle.data-point, path.data-point');
}

/**
 * Interact with a specific legend item
 */
export async function clickLegendItem(page: Page, itemText: string) {
  const legend = page.locator('.legend').first();
  const legendItem = legend.locator(`.legend-item:has-text("${itemText}")`);
  await legendItem.click();
}

/**
 * Perform zoom action on chart
 */
export async function zoomChart(page: Page, direction: 'in' | 'out', amount: number = 100) {
  const chart = page.locator('svg.timeline-chart').first();
  await chart.hover();
  const wheelDelta = direction === 'in' ? -amount : amount;
  await page.mouse.wheel(0, wheelDelta);
  await page.waitForTimeout(300); // Wait for zoom animation
}

/**
 * Reset chart zoom
 */
export async function resetZoom(page: Page) {
  const resetButton = page.getByRole('button', { name: 'Reset Zoom' });
  if (await resetButton.isVisible()) {
    await resetButton.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Take a screenshot with consistent settings
 */
export async function takeScreenshot(page: Page, name: string, element?: string) {
  const options = {
    path: `e2e/screenshots/${name}.png`,
    animations: 'disabled' as const,
  };

  if (element) {
    const el = page.locator(element).first();
    await el.screenshot(options);
  } else {
    await page.screenshot({ ...options, fullPage: true });
  }
}

/**
 * Wait for API response
 */
export async function waitForAPIResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(
    response => {
      const url = response.url();
      return typeof urlPattern === 'string' 
        ? url.includes(urlPattern)
        : urlPattern.test(url);
    },
    { timeout: 10000 }
  );
}

/**
 * Check if element is fully visible in viewport
 */
export async function isFullyVisible(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector).first();
  const box = await element.boundingBox();
  
  if (!box) return false;
  
  const viewport = page.viewportSize();
  if (!viewport) return false;
  
  return (
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= viewport.width &&
    box.y + box.height <= viewport.height
  );
}

/**
 * Get chart dimensions
 */
export async function getChartDimensions(page: Page) {
  const chart = page.locator('svg.timeline-chart').first();
  const box = await chart.boundingBox();
  
  if (!box) {
    throw new Error('Chart not found or not visible');
  }
  
  return {
    width: box.width,
    height: box.height,
    x: box.x,
    y: box.y
  };
}

/**
 * Verify no console errors
 */
export async function verifyNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  
  // Return a function to check errors at the end of the test
  return () => {
    expect(errors).toHaveLength(0);
  };
}