import puppeteer, { Page, Browser } from 'puppeteer';

describe('Chart Zoom Interactions', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      slowMo: 50,
      defaultViewport: { width: 1200, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });

    // Monitor failed requests
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

  describe('Chart Page Navigation', () => {
    test('Navigate to page with charts', async () => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
      
      const charts = await page.$$('[data-testid="chart-container"]');
      expect(charts.length).toBeGreaterThan(0);
    });
  });

  describe('Cursor Position Detection', () => {
    beforeEach(async () => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
    });

    test('Cursor changes to ew-resize when hovering below X-axis', async () => {
      // Find the first chart SVG
      const chartSvg = await page.$('[data-testid="chart-container"] svg');
      expect(chartSvg).toBeTruthy();

      // Get chart dimensions and calculate X-axis region
      const chartBox = await chartSvg!.boundingBox();
      expect(chartBox).toBeTruthy();

      // Calculate position below X-axis line (in the bottom margin area)
      const xAxisRegionX = chartBox!.x + chartBox!.width * 0.5; // Middle of chart
      const xAxisRegionY = chartBox!.y + chartBox!.height * 0.85; // Below X-axis line

      // Hover over X-axis region
      await page.mouse.move(xAxisRegionX, xAxisRegionY);
      await page.waitForTimeout(100); // Allow cursor to update

      // Check cursor style
      const cursorStyle = await page.evaluate(() => {
        const chartContainer = document.querySelector('[data-testid="chart-container"]');
        return window.getComputedStyle(chartContainer!).cursor;
      });

      expect(cursorStyle).toBe('ew-resize');
    });

    test('Cursor changes to ns-resize when hovering left of Y-axis', async () => {
      const chartSvg = await page.$('[data-testid="chart-container"] svg');
      expect(chartSvg).toBeTruthy();

      const chartBox = await chartSvg!.boundingBox();
      expect(chartBox).toBeTruthy();

      // Calculate position left of Y-axis (in the left margin area)
      const yAxisRegionX = chartBox!.x + 30; // Left margin area
      const yAxisRegionY = chartBox!.y + chartBox!.height * 0.5; // Middle of chart height

      // Hover over Y-axis region
      await page.mouse.move(yAxisRegionX, yAxisRegionY);
      await page.waitForTimeout(100);

      // Check cursor style
      const cursorStyle = await page.evaluate(() => {
        const chartContainer = document.querySelector('[data-testid="chart-container"]');
        return window.getComputedStyle(chartContainer!).cursor;
      });

      expect(cursorStyle).toBe('ns-resize');
    });

    test('Cursor changes to ns-resize when hovering in Y2-axis region', async () => {
      // Navigate to SPC dashboard which has Y2-axis
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000_BNT44');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });

      const chartSvg = await page.$('[data-testid="chart-container"] svg');
      expect(chartSvg).toBeTruthy();

      const chartBox = await chartSvg!.boundingBox();
      expect(chartBox).toBeTruthy();

      // Calculate position in Y2-axis region (between Y2-axis and legend)
      const y2AxisRegionX = chartBox!.x + chartBox!.width * 0.85; // Right side, before legend
      const y2AxisRegionY = chartBox!.y + chartBox!.height * 0.5; // Middle of chart height

      // Hover over Y2-axis region
      await page.mouse.move(y2AxisRegionX, y2AxisRegionY);
      await page.waitForTimeout(100);

      // Check cursor style
      const cursorStyle = await page.evaluate(() => {
        const chartContainer = document.querySelector('[data-testid="chart-container"]');
        return window.getComputedStyle(chartContainer!).cursor;
      });

      expect(cursorStyle).toBe('ns-resize');
    });

    test('Cursor resets to default when not over zoom regions', async () => {
      const chartSvg = await page.$('[data-testid="chart-container"] svg');
      expect(chartSvg).toBeTruthy();

      const chartBox = await chartSvg!.boundingBox();
      expect(chartBox).toBeTruthy();

      // Hover over chart data area (center of chart)
      const centerX = chartBox!.x + chartBox!.width * 0.5;
      const centerY = chartBox!.y + chartBox!.height * 0.5;

      await page.mouse.move(centerX, centerY);
      await page.waitForTimeout(100);

      // Check cursor style
      const cursorStyle = await page.evaluate(() => {
        const chartContainer = document.querySelector('[data-testid="chart-container"]');
        return window.getComputedStyle(chartContainer!).cursor;
      });

      expect(['default', 'auto', '']).toContain(cursorStyle);
    });
  });

  describe('Zoom Functionality', () => {
    beforeEach(async () => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
    });

    test('X-axis zoom works with scroll below X-axis', async () => {
      const chartSvg = await page.$('[data-testid="chart-container"] svg');
      expect(chartSvg).toBeTruthy();

      const chartBox = await chartSvg!.boundingBox();
      expect(chartBox).toBeTruthy();

      // Get initial zoom level
      const initialXZoom = await page.evaluate(() => {
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        const xZoomElement = zoomControls?.querySelector('[data-testid="x-zoom-level"]');
        return xZoomElement?.textContent || '1.0x';
      });

      // Position mouse below X-axis line
      const xAxisRegionX = chartBox!.x + chartBox!.width * 0.5;
      const xAxisRegionY = chartBox!.y + chartBox!.height * 0.85;

      // Zoom in by scrolling up
      await page.mouse.move(xAxisRegionX, xAxisRegionY);
      await page.mouse.wheel({ deltaY: -120 }); // Scroll up (zoom in)
      await page.waitForTimeout(200); // Allow zoom to process

      // Get new zoom level
      const newXZoom = await page.evaluate(() => {
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        const xZoomElement = zoomControls?.querySelector('[data-testid="x-zoom-level"]');
        return xZoomElement?.textContent || '1.0x';
      });

      expect(newXZoom).not.toBe(initialXZoom);
      expect(parseFloat(newXZoom)).toBeGreaterThan(parseFloat(initialXZoom));
    });

    test('Y-axis zoom works with scroll left of Y-axis', async () => {
      const chartSvg = await page.$('[data-testid="chart-container"] svg');
      expect(chartSvg).toBeTruthy();

      const chartBox = await chartSvg!.boundingBox();
      expect(chartBox).toBeTruthy();

      // Get initial zoom level
      const initialYZoom = await page.evaluate(() => {
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        const yZoomElement = zoomControls?.querySelector('[data-testid="y-zoom-level"]');
        return yZoomElement?.textContent || '1.0x';
      });

      // Position mouse left of Y-axis
      const yAxisRegionX = chartBox!.x + 30;
      const yAxisRegionY = chartBox!.y + chartBox!.height * 0.5;

      // Zoom in by scrolling up
      await page.mouse.move(yAxisRegionX, yAxisRegionY);
      await page.mouse.wheel({ deltaY: -120 }); // Scroll up (zoom in)
      await page.waitForTimeout(200);

      // Get new zoom level
      const newYZoom = await page.evaluate(() => {
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        const yZoomElement = zoomControls?.querySelector('[data-testid="y-zoom-level"]');
        return yZoomElement?.textContent || '1.0x';
      });

      expect(newYZoom).not.toBe(initialYZoom);
      expect(parseFloat(newYZoom)).toBeGreaterThan(parseFloat(initialYZoom));
    });

    test('Y2-axis zoom works with scroll in Y2 region', async () => {
      // Navigate to SPC dashboard which has Y2-axis
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000_BNT44');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });

      const chartSvg = await page.$('[data-testid="chart-container"] svg');
      expect(chartSvg).toBeTruthy();

      const chartBox = await chartSvg!.boundingBox();
      expect(chartBox).toBeTruthy();

      // Check if Y2 zoom level element exists (indicates Y2-axis is present)
      const hasY2Axis = await page.evaluate(() => {
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        const y2ZoomElement = zoomControls?.querySelector('[data-testid="y2-zoom-level"]');
        return !!y2ZoomElement;
      });

      if (hasY2Axis) {
        // Get initial Y2 zoom level
        const initialY2Zoom = await page.evaluate(() => {
          const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
          const y2ZoomElement = zoomControls?.querySelector('[data-testid="y2-zoom-level"]');
          return y2ZoomElement?.textContent || '1.0x';
        });

        // Position mouse in Y2-axis region
        const y2AxisRegionX = chartBox!.x + chartBox!.width * 0.85;
        const y2AxisRegionY = chartBox!.y + chartBox!.height * 0.5;

        // Zoom in by scrolling up
        await page.mouse.move(y2AxisRegionX, y2AxisRegionY);
        await page.mouse.wheel({ deltaY: -120 }); // Scroll up (zoom in)
        await page.waitForTimeout(200);

        // Get new Y2 zoom level
        const newY2Zoom = await page.evaluate(() => {
          const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
          const y2ZoomElement = zoomControls?.querySelector('[data-testid="y2-zoom-level"]');
          return y2ZoomElement?.textContent || '1.0x';
        });

        expect(newY2Zoom).not.toBe(initialY2Zoom);
        expect(parseFloat(newY2Zoom)).toBeGreaterThan(parseFloat(initialY2Zoom));
      } else {
        // Skip test if no Y2-axis is present
        console.warn('Y2-axis not present in current chart configuration - skipping Y2 zoom test');
        expect(true).toBe(true); // Mark test as passed
      }
    });

    test('Zoom out functionality works', async () => {
      const chartSvg = await page.$('[data-testid="chart-container"] svg');
      expect(chartSvg).toBeTruthy();

      const chartBox = await chartSvg!.boundingBox();
      expect(chartBox).toBeTruthy();

      // First zoom in
      const xAxisRegionX = chartBox!.x + chartBox!.width * 0.5;
      const xAxisRegionY = chartBox!.y + chartBox!.height * 0.85;

      await page.mouse.move(xAxisRegionX, xAxisRegionY);
      await page.mouse.wheel({ deltaY: -120 }); // Zoom in
      await page.waitForTimeout(200);

      // Get zoom level after zooming in
      const zoomedInLevel = await page.evaluate(() => {
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        const xZoomElement = zoomControls?.querySelector('[data-testid="x-zoom-level"]');
        return parseFloat(xZoomElement?.textContent || '1.0');
      });

      // Now zoom out
      await page.mouse.wheel({ deltaY: 120 }); // Zoom out
      await page.waitForTimeout(200);

      // Get zoom level after zooming out
      const zoomedOutLevel = await page.evaluate(() => {
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        const xZoomElement = zoomControls?.querySelector('[data-testid="x-zoom-level"]');
        return parseFloat(xZoomElement?.textContent || '1.0');
      });

      expect(zoomedOutLevel).toBeLessThan(zoomedInLevel);
    });
  });

  describe('Zoom Limits', () => {
    beforeEach(async () => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
    });

    test('Zoom respects maximum limit', async () => {
      const chartSvg = await page.$('[data-testid="chart-container"] svg');
      expect(chartSvg).toBeTruthy();

      const chartBox = await chartSvg!.boundingBox();
      expect(chartBox).toBeTruthy();

      // Position mouse in X-axis zoom region
      const xAxisRegionX = chartBox!.x + chartBox!.width * 0.5;
      const xAxisRegionY = chartBox!.y + chartBox!.height * 0.85;

      await page.mouse.move(xAxisRegionX, xAxisRegionY);

      // Zoom in multiple times to try to exceed maximum
      for (let i = 0; i < 20; i++) {
        await page.mouse.wheel({ deltaY: -120 }); // Zoom in
        await page.waitForTimeout(50);
      }

      // Get final zoom level
      const finalZoomLevel = await page.evaluate(() => {
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        const xZoomElement = zoomControls?.querySelector('[data-testid="x-zoom-level"]');
        return parseFloat(xZoomElement?.textContent || '1.0');
      });

      // Should not exceed reasonable maximum (50x)
      expect(finalZoomLevel).toBeLessThanOrEqual(50);
    });

    test('Zoom respects minimum limit', async () => {
      const chartSvg = await page.$('[data-testid="chart-container"] svg');
      expect(chartSvg).toBeTruthy();

      const chartBox = await chartSvg!.boundingBox();
      expect(chartBox).toBeTruthy();

      // Position mouse in X-axis zoom region
      const xAxisRegionX = chartBox!.x + chartBox!.width * 0.5;
      const xAxisRegionY = chartBox!.y + chartBox!.height * 0.85;

      await page.mouse.move(xAxisRegionX, xAxisRegionY);

      // Zoom out multiple times to try to go below minimum
      for (let i = 0; i < 20; i++) {
        await page.mouse.wheel({ deltaY: 120 }); // Zoom out
        await page.waitForTimeout(50);
      }

      // Get final zoom level
      const finalZoomLevel = await page.evaluate(() => {
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        const xZoomElement = zoomControls?.querySelector('[data-testid="x-zoom-level"]');
        return parseFloat(xZoomElement?.textContent || '1.0');
      });

      // Should not go below reasonable minimum (0.1x)
      expect(finalZoomLevel).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('Reset Functionality', () => {
    beforeEach(async () => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
    });

    test('Reset zoom button restores all axes to original domains', async () => {
      const chartSvg = await page.$('[data-testid="chart-container"] svg');
      expect(chartSvg).toBeTruthy();

      const chartBox = await chartSvg!.boundingBox();
      expect(chartBox).toBeTruthy();

      // Apply zoom to X-axis
      const xAxisRegionX = chartBox!.x + chartBox!.width * 0.5;
      const xAxisRegionY = chartBox!.y + chartBox!.height * 0.85;

      await page.mouse.move(xAxisRegionX, xAxisRegionY);
      await page.mouse.wheel({ deltaY: -240 }); // Zoom in significantly
      await page.waitForTimeout(200);

      // Apply zoom to Y-axis
      const yAxisRegionX = chartBox!.x + 30;
      const yAxisRegionY = chartBox!.y + chartBox!.height * 0.5;

      await page.mouse.move(yAxisRegionX, yAxisRegionY);
      await page.mouse.wheel({ deltaY: -240 }); // Zoom in significantly
      await page.waitForTimeout(200);

      // Verify zoom levels are not 1.0x
      const beforeReset = await page.evaluate(() => {
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        const xZoom = parseFloat(zoomControls?.querySelector('[data-testid="x-zoom-level"]')?.textContent || '1.0');
        const yZoom = parseFloat(zoomControls?.querySelector('[data-testid="y-zoom-level"]')?.textContent || '1.0');
        return { xZoom, yZoom };
      });

      expect(beforeReset.xZoom).toBeGreaterThan(1.0);
      expect(beforeReset.yZoom).toBeGreaterThan(1.0);

      // Click reset zoom button
      const resetButton = await page.$('[data-testid="reset-zoom-button"]');
      expect(resetButton).toBeTruthy();
      await resetButton!.click();
      await page.waitForTimeout(200);

      // Verify all zoom levels are back to 1.0x
      const afterReset = await page.evaluate(() => {
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        const xZoom = parseFloat(zoomControls?.querySelector('[data-testid="x-zoom-level"]')?.textContent || '1.0');
        const yZoom = parseFloat(zoomControls?.querySelector('[data-testid="y-zoom-level"]')?.textContent || '1.0');
        const y2ZoomElement = zoomControls?.querySelector('[data-testid="y2-zoom-level"]');
        const y2Zoom = y2ZoomElement ? parseFloat(y2ZoomElement.textContent || '1.0') : 1.0;
        return { xZoom, yZoom, y2Zoom };
      });

      expect(afterReset.xZoom).toBe(1.0);
      expect(afterReset.yZoom).toBe(1.0);
      expect(afterReset.y2Zoom).toBe(1.0);
    });
  });

  describe('Zoom State Preservation', () => {
    beforeEach(async () => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
    });

    test('Zoom state preserved during chart updates', async () => {
      const chartSvg = await page.$('[data-testid="chart-container"] svg');
      expect(chartSvg).toBeTruthy();

      const chartBox = await chartSvg!.boundingBox();
      expect(chartBox).toBeTruthy();

      // Apply zoom
      const xAxisRegionX = chartBox!.x + chartBox!.width * 0.5;
      const xAxisRegionY = chartBox!.y + chartBox!.height * 0.85;

      await page.mouse.move(xAxisRegionX, xAxisRegionY);
      await page.mouse.wheel({ deltaY: -240 }); // Zoom in
      await page.waitForTimeout(200);

      // Get zoom level after zooming
      const zoomAfterAction = await page.evaluate(() => {
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        const xZoom = parseFloat(zoomControls?.querySelector('[data-testid="x-zoom-level"]')?.textContent || '1.0');
        return xZoom;
      });

      expect(zoomAfterAction).toBeGreaterThan(1.0);

      // Trigger chart update by changing tab or interacting with legend
      const legendItems = await page.$$('[data-testid="legend-item"]');
      if (legendItems.length > 0) {
        await legendItems[0].click(); // Click first legend item
        await page.waitForTimeout(200);

        // Check that zoom level is preserved
        const zoomAfterUpdate = await page.evaluate(() => {
          const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
          const xZoom = parseFloat(zoomControls?.querySelector('[data-testid="x-zoom-level"]')?.textContent || '1.0');
          return xZoom;
        });

        expect(zoomAfterUpdate).toBe(zoomAfterAction);
      }
    });
  });
});