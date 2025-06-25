import puppeteer, { Page, Browser } from 'puppeteer';

describe('Chart Margin Removal Validation', () => {
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

  describe('Main Page Charts - Margin Validation', () => {
    test('Chart data points can reach top and bottom edges', async () => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
      await page.waitForTimeout(3000); // Wait for chart to fully render

      const marginValidation = await page.evaluate(() => {
        const chartContainer = document.querySelector('[data-testid="chart-container"]');
        const svg = chartContainer?.querySelector('svg');
        const dataPoints = svg?.querySelectorAll('circle') || [];
        
        if (!svg || dataPoints.length === 0) {
          return { 
            hasData: false, 
            error: 'No SVG or data points found',
            svgExists: !!svg,
            dataPointCount: dataPoints.length
          };
        }

        // Get chart dimensions
        const svgRect = svg.getBoundingClientRect();
        const chartHeight = svgRect.height;
        const chartWidth = svgRect.width;
        
        // Extract Y positions from data points
        const yPositions: number[] = [];
        const xPositions: number[] = [];
        
        Array.from(dataPoints).forEach(circle => {
          // Handle both direct positioning and transform-based positioning
          let x = 0, y = 0;
          
          const transform = circle.getAttribute('transform');
          if (transform) {
            const translateMatch = transform.match(/translate\\(([^,]+),([^)]+)\\)/);
            if (translateMatch) {
              x = parseFloat(translateMatch[1]);
              y = parseFloat(translateMatch[2]);
            }
          } else {
            x = parseFloat(circle.getAttribute('cx') || '0');
            y = parseFloat(circle.getAttribute('cy') || '0');
          }
          
          xPositions.push(x);
          yPositions.push(y);
        });

        const minY = Math.min(...yPositions);
        const maxY = Math.max(...yPositions);
        const minX = Math.min(...xPositions);
        const maxX = Math.max(...xPositions);

        return {
          hasData: true,
          chartWidth,
          chartHeight,
          dataPointCount: dataPoints.length,
          yRange: { min: minY, max: maxY, spread: maxY - minY },
          xRange: { min: minX, max: maxX, spread: maxX - minX },
          // Check if data can reach near edges (with 10px tolerance)
          canReachTop: minY <= 10,
          canReachBottom: maxY >= chartHeight - 10,
          maintainsLeftMargin: minX >= 20 && minX <= 40,
          maintainsRightMargin: maxX >= chartWidth - 40 && maxX <= chartWidth - 20
        };
      });

      expect(marginValidation.hasData).toBe(true);
      expect(marginValidation.dataPointCount).toBeGreaterThan(0);
      
      console.log('Chart metrics:', {
        dimensions: `${marginValidation.chartWidth}x${marginValidation.chartHeight}`,
        dataPoints: marginValidation.dataPointCount,
        yRange: marginValidation.yRange,
        xRange: marginValidation.xRange
      });
      
      // Verify top/bottom margins are removed (data can reach edges)
      expect(marginValidation.canReachTop).toBe(true);
      expect(marginValidation.canReachBottom).toBe(true);
      
      // Verify left/right margins are maintained
      expect(marginValidation.maintainsLeftMargin).toBe(true);
      expect(marginValidation.maintainsRightMargin).toBe(true);
    });

    test('Chart clipping boundaries updated correctly', async () => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
      await page.waitForTimeout(2000);

      const clippingValidation = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="chart-container"] svg');
        const clipPath = svg?.querySelector('clipPath rect');
        
        if (!svg || !clipPath) {
          return { 
            hasClipPath: false,
            svgExists: !!svg,
            clipPathExists: !!clipPath
          };
        }

        const svgRect = svg.getBoundingClientRect();
        
        return {
          hasClipPath: true,
          chartHeight: svgRect.height,
          chartWidth: svgRect.width,
          clipRect: {
            x: parseFloat(clipPath.getAttribute('x') || '0'),
            y: parseFloat(clipPath.getAttribute('y') || '0'),
            width: parseFloat(clipPath.getAttribute('width') || '0'),
            height: parseFloat(clipPath.getAttribute('height') || '0')
          }
        };
      });

      expect(clippingValidation.hasClipPath).toBe(true);
      
      console.log('Clipping metrics:', clippingValidation.clipRect);
      
      // Verify clipping boundaries
      expect(clippingValidation.clipRect.x).toBe(30); // Left margin preserved
      expect(clippingValidation.clipRect.y).toBe(0);  // Top margin removed
      expect(clippingValidation.clipRect.width).toBeGreaterThan(0);
      expect(clippingValidation.clipRect.height).toBeCloseTo(clippingValidation.chartHeight, 5); // Full height
    });
  });

  describe('SPC Dashboard Charts - Margin Validation', () => {
    test('SPC charts utilize full vertical space', async () => {
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000_BNT44');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
      await page.waitForTimeout(4000); // Extra wait for SPC data loading

      const spcValidation = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="chart-container"] svg');
        const dataPoints = svg?.querySelectorAll('circle') || [];
        const controlLines = svg?.querySelectorAll('line') || [];
        
        if (!svg) {
          return { hasSvg: false };
        }

        const svgRect = svg.getBoundingClientRect();
        const chartHeight = svgRect.height;
        
        let yPositions: number[] = [];
        
        if (dataPoints.length > 0) {
          Array.from(dataPoints).forEach(circle => {
            let y = 0;
            const transform = circle.getAttribute('transform');
            if (transform) {
              const translateMatch = transform.match(/translate\\(([^,]+),([^)]+)\\)/);
              if (translateMatch) {
                y = parseFloat(translateMatch[2]);
              }
            } else {
              y = parseFloat(circle.getAttribute('cy') || '0');
            }
            yPositions.push(y);
          });
        }

        const minY = yPositions.length > 0 ? Math.min(...yPositions) : null;
        const maxY = yPositions.length > 0 ? Math.max(...yPositions) : null;

        return {
          hasSvg: true,
          chartHeight,
          dataPointCount: dataPoints.length,
          controlLineCount: controlLines.length,
          yRange: yPositions.length > 0 ? { min: minY, max: maxY, spread: maxY! - minY! } : null,
          utilizesFullHeight: yPositions.length > 0 ? (maxY! - minY!) > chartHeight * 0.6 : false
        };
      });

      expect(spcValidation.hasSvg).toBe(true);
      
      console.log('SPC chart metrics:', {
        height: spcValidation.chartHeight,
        dataPoints: spcValidation.dataPointCount,
        controlLines: spcValidation.controlLineCount,
        yRange: spcValidation.yRange
      });
      
      if (spcValidation.dataPointCount > 0 && spcValidation.yRange) {
        // Verify data can reach near top and bottom edges
        expect(spcValidation.yRange.min).toBeLessThanOrEqual(15);
        expect(spcValidation.yRange.max).toBeGreaterThanOrEqual(spcValidation.chartHeight - 15);
        expect(spcValidation.utilizesFullHeight).toBe(true);
      }
    });
  });

  describe('Zoom Level Responsiveness', () => {
    [0.75, 1.0, 1.25].forEach(zoomLevel => {
      test(`Charts maintain proper margins at ${zoomLevel * 100}% zoom`, async () => {
        await page.setViewportSize({ 
          width: Math.round(1200 / zoomLevel), 
          height: Math.round(800 / zoomLevel) 
        });
        
        await page.goto('http://localhost:3000');
        await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Apply page zoom
        await page.evaluate((zoom) => {
          document.body.style.zoom = zoom.toString();
        }, zoomLevel);
        
        await page.waitForTimeout(1000);

        const zoomValidation = await page.evaluate(() => {
          const svg = document.querySelector('[data-testid="chart-container"] svg');
          const dataPoints = svg?.querySelectorAll('circle') || [];
          const clipPath = svg?.querySelector('clipPath rect');
          
          if (!svg || dataPoints.length === 0) {
            return { hasData: false };
          }

          const svgRect = svg.getBoundingClientRect();
          
          const yPositions = Array.from(dataPoints).map(circle => {
            const transform = circle.getAttribute('transform') || '';
            const translateMatch = transform.match(/translate\\(([^,]+),([^)]+)\\)/);
            if (translateMatch) {
              return parseFloat(translateMatch[2]);
            }
            return parseFloat(circle.getAttribute('cy') || '0');
          });

          return {
            hasData: true,
            chartHeight: svgRect.height,
            minY: Math.min(...yPositions),
            maxY: Math.max(...yPositions),
            clipY: clipPath ? parseFloat(clipPath.getAttribute('y') || '0') : null
          };
        });

        expect(zoomValidation.hasData).toBe(true);
        
        // Verify margins work at different zoom levels
        expect(zoomValidation.minY).toBeLessThanOrEqual(20); // Top edge accessible
        expect(zoomValidation.maxY).toBeGreaterThanOrEqual(zoomValidation.chartHeight - 20); // Bottom edge accessible
        
        // Verify clipping starts at top
        if (zoomValidation.clipY !== null) {
          expect(zoomValidation.clipY).toBe(0);
        }
      });
    });
  });

  describe('Regression Prevention', () => {
    test('Chart functionality remains intact after margin changes', async () => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const functionalityCheck = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="chart-container"] svg');
        const axes = svg?.querySelectorAll('.axis, .x-axis, .y-axis') || [];
        const dataPoints = svg?.querySelectorAll('circle') || [];
        const legendItems = document.querySelectorAll('[data-testid="legend-item"]') || [];
        const zoomControls = document.querySelector('[data-testid="zoom-controls"]');
        
        return {
          hasSvg: !!svg,
          axisCount: axes.length,
          dataPointCount: dataPoints.length,
          legendItemCount: legendItems.length,
          hasZoomControls: !!zoomControls,
          chartStructureIntact: !!(svg && axes.length > 0 && dataPoints.length > 0)
        };
      });

      expect(functionalityCheck.hasSvg).toBe(true);
      expect(functionalityCheck.axisCount).toBeGreaterThan(0);
      expect(functionalityCheck.dataPointCount).toBeGreaterThan(0);
      expect(functionalityCheck.hasZoomControls).toBe(true);
      expect(functionalityCheck.chartStructureIntact).toBe(true);
      
      console.log('Functionality preserved:', functionalityCheck);
    });
  });
});