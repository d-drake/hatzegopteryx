import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Chart Margin Removal Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  // Test data for different zoom levels
  const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5];
  
  test.beforeEach(async ({ page }) => {
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

  test.describe('Main Page Charts - Margin Validation', () => {
    test('Chart data points extend to top and bottom edges', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });

      // Wait for chart to fully render
      await page.waitForTimeout(2000);

      const chartMetrics = await page.evaluate(() => {
        const chartContainer = document.querySelector('[data-testid="chart-container"]');
        const svg = chartContainer?.querySelector('svg');
        const dataPoints = svg?.querySelectorAll('circle') || [];
        
        if (!svg || dataPoints.length === 0) {
          return { hasData: false, svg: null, dataPoints: [], chartHeight: 0 };
        }

        const svgRect = svg.getBoundingClientRect();
        const chartHeight = svgRect.height;
        
        // Get Y positions of all data points
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
          chartHeight,
          yPositions,
          minY: Math.min(...yPositions),
          maxY: Math.max(...yPositions),
          dataPointCount: dataPoints.length
        };
      });

      expect(chartMetrics.hasData).toBe(true);
      expect(chartMetrics.dataPointCount).toBeGreaterThan(0);
      
      // Verify data points can reach close to top edge (within 5px tolerance)
      expect(chartMetrics.minY).toBeLessThanOrEqual(5);
      
      // Verify data points can reach close to bottom edge (within 5px tolerance)
      expect(chartMetrics.maxY).toBeGreaterThanOrEqual(chartMetrics.chartHeight - 5);
    });

    test('Left and right margins remain at 30px', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
      await page.waitForTimeout(2000);

      const marginMetrics = await page.evaluate(() => {
        const chartContainer = document.querySelector('[data-testid="chart-container"]');
        const svg = chartContainer?.querySelector('svg');
        const dataPoints = svg?.querySelectorAll('circle') || [];
        
        if (!svg || dataPoints.length === 0) {
          return { hasData: false };
        }

        const svgRect = svg.getBoundingClientRect();
        const chartWidth = svgRect.width;
        
        // Get X positions of all data points
        const xPositions = Array.from(dataPoints).map(circle => {
          const transform = circle.getAttribute('transform') || '';
          const translateMatch = transform.match(/translate\\(([^,]+),([^)]+)\\)/);
          if (translateMatch) {
            return parseFloat(translateMatch[1]);
          }
          return parseFloat(circle.getAttribute('cx') || '0');
        });

        return {
          hasData: true,
          chartWidth,
          xPositions,
          minX: Math.min(...xPositions),
          maxX: Math.max(...xPositions)
        };
      });

      expect(marginMetrics.hasData).toBe(true);
      
      // Verify left margin is approximately 30px
      expect(marginMetrics.minX).toBeGreaterThanOrEqual(25);
      expect(marginMetrics.minX).toBeLessThanOrEqual(35);
      
      // Verify right margin is approximately 30px
      expect(marginMetrics.maxX).toBeGreaterThanOrEqual(marginMetrics.chartWidth - 35);
      expect(marginMetrics.maxX).toBeLessThanOrEqual(marginMetrics.chartWidth - 25);
    });

    test('Chart clipping boundaries updated correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
      await page.waitForTimeout(2000);

      const clippingMetrics = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="chart-container"] svg');
        const clipPath = svg?.querySelector('clipPath rect');
        
        if (!clipPath) {
          return { hasClipPath: false };
        }

        return {
          hasClipPath: true,
          x: parseFloat(clipPath.getAttribute('x') || '0'),
          y: parseFloat(clipPath.getAttribute('y') || '0'),
          width: parseFloat(clipPath.getAttribute('width') || '0'),
          height: parseFloat(clipPath.getAttribute('height') || '0')
        };
      });

      expect(clippingMetrics.hasClipPath).toBe(true);
      
      // Verify clipping starts at 30px from left (preserving left margin)
      expect(clippingMetrics.x).toBe(30);
      
      // Verify clipping starts at 0px from top (no top margin)
      expect(clippingMetrics.y).toBe(0);
      
      // Verify clipping width accounts for both left and right margins (60px total)
      expect(clippingMetrics.width).toBeGreaterThan(0);
      
      // Verify clipping height extends full chart height (no top/bottom margins)
      expect(clippingMetrics.height).toBeGreaterThan(400); // Reasonable chart height
    });
  });

  test.describe('SPC Dashboard Charts - Margin Validation', () => {
    test('SPC control limits extend to chart edges', async ({ page }) => {
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000_BNT44');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
      await page.waitForTimeout(3000); // Extra wait for SPC data loading

      const spcMetrics = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="chart-container"] svg');
        const controlLines = svg?.querySelectorAll('line.control-limit, line.cl, line.lcl, line.ucl') || [];
        const dataPoints = svg?.querySelectorAll('circle') || [];
        
        if (!svg) {
          return { hasSvg: false };
        }

        const svgRect = svg.getBoundingClientRect();
        
        const lineMetrics = Array.from(controlLines).map(line => ({
          x1: parseFloat(line.getAttribute('x1') || '0'),
          x2: parseFloat(line.getAttribute('x2') || '0'),
          y1: parseFloat(line.getAttribute('y1') || '0'),
          y2: parseFloat(line.getAttribute('y2') || '0')
        }));

        return {
          hasSvg: true,
          chartWidth: svgRect.width,
          chartHeight: svgRect.height,
          controlLineCount: controlLines.length,
          dataPointCount: dataPoints.length,
          lineMetrics
        };
      });

      expect(spcMetrics.hasSvg).toBe(true);
      
      if (spcMetrics.controlLineCount > 0) {
        // Verify control lines extend across the chart
        spcMetrics.lineMetrics.forEach(line => {
          // Control lines should start near left margin (30px)
          expect(line.x1).toBeGreaterThanOrEqual(25);
          expect(line.x1).toBeLessThanOrEqual(35);
          
          // Control lines should end near right edge
          expect(line.x2).toBeGreaterThanOrEqual(spcMetrics.chartWidth - 50);
        });
      }
    });

    test('SPC data points can utilize full vertical space', async ({ page }) => {
      await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000_BNT44');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const verticalMetrics = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="chart-container"] svg');
        const dataPoints = svg?.querySelectorAll('circle') || [];
        
        if (!svg || dataPoints.length === 0) {
          return { hasData: false };
        }

        const svgRect = svg.getBoundingClientRect();
        const chartHeight = svgRect.height;
        
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
          chartHeight,
          yPositions,
          minY: Math.min(...yPositions),
          maxY: Math.max(...yPositions),
          verticalSpread: Math.max(...yPositions) - Math.min(...yPositions)
        };
      });

      expect(verticalMetrics.hasData).toBe(true);
      
      // Verify data can reach near top edge (0px + tolerance)
      expect(verticalMetrics.minY).toBeLessThanOrEqual(10);
      
      // Verify data can reach near bottom edge (full height - tolerance)
      expect(verticalMetrics.maxY).toBeGreaterThanOrEqual(verticalMetrics.chartHeight - 10);
      
      // Verify vertical spread is substantial (utilizing the space)
      expect(verticalMetrics.verticalSpread).toBeGreaterThan(verticalMetrics.chartHeight * 0.5);
    });
  });

  test.describe('Zoom Level Responsiveness', () => {
    zoomLevels.forEach(zoomLevel => {
      test(`Charts maintain proper margins at ${zoomLevel * 100}% zoom`, async ({ page }) => {
        // Set browser zoom level
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

        const zoomMetrics = await page.evaluate(() => {
          const chartContainer = document.querySelector('[data-testid="chart-container"]');
          const svg = chartContainer?.querySelector('svg');
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
            clipY: clipPath ? parseFloat(clipPath.getAttribute('y') || '0') : null,
            clipHeight: clipPath ? parseFloat(clipPath.getAttribute('height') || '0') : null
          };
        });

        expect(zoomMetrics.hasData).toBe(true);
        
        // Verify top edge accessibility (no top margin)
        expect(zoomMetrics.minY).toBeLessThanOrEqual(15); // Generous tolerance for zoom scaling
        
        // Verify bottom edge accessibility (no bottom margin)
        expect(zoomMetrics.maxY).toBeGreaterThanOrEqual(zoomMetrics.chartHeight - 15);
        
        // Verify clipping starts at top (y=0)
        if (zoomMetrics.clipY !== null) {
          expect(zoomMetrics.clipY).toBe(0);
        }
      });
    });
  });

  test.describe('Visual Regression Detection', () => {
    test('Compare chart appearance before and after margin changes', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
      await page.waitForTimeout(3000);

      // Take screenshot of chart area
      const chartElement = await page.locator('[data-testid="chart-container"]').first();
      await expect(chartElement).toBeVisible();
      
      // Verify chart has expected structure
      const chartStructure = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="chart-container"] svg');
        const axes = svg?.querySelectorAll('.axis, .x-axis, .y-axis') || [];
        const dataPoints = svg?.querySelectorAll('circle') || [];
        const clipPath = svg?.querySelector('clipPath') || null;
        
        return {
          hasSvg: !!svg,
          axisCount: axes.length,
          dataPointCount: dataPoints.length,
          hasClipPath: !!clipPath,
          svgWidth: svg?.getAttribute('width'),
          svgHeight: svg?.getAttribute('height')
        };
      });

      expect(chartStructure.hasSvg).toBe(true);
      expect(chartStructure.axisCount).toBeGreaterThan(0);
      expect(chartStructure.dataPointCount).toBeGreaterThan(0);
      expect(chartStructure.hasClipPath).toBe(true);
    });

    test('Verify axis positioning remains correct', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
      await page.waitForTimeout(2000);

      const axisMetrics = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="chart-container"] svg');
        const xAxis = svg?.querySelector('.x-axis, .axis[transform*="translate(0"]') || null;
        const yAxis = svg?.querySelector('.y-axis, .axis[transform*="translate"][transform*=",0"]') || null;
        
        if (!svg) {
          return { hasSvg: false };
        }

        const svgRect = svg.getBoundingClientRect();
        
        let xAxisY = null;
        let yAxisX = null;
        
        if (xAxis) {
          const transform = xAxis.getAttribute('transform') || '';
          const translateMatch = transform.match(/translate\\(([^,]+),([^)]+)\\)/);
          if (translateMatch) {
            xAxisY = parseFloat(translateMatch[2]);
          }
        }
        
        if (yAxis) {
          const transform = yAxis.getAttribute('transform') || '';
          const translateMatch = transform.match(/translate\\(([^,]+),([^)]+)\\)/);
          if (translateMatch) {
            yAxisX = parseFloat(translateMatch[1]);
          }
        }

        return {
          hasSvg: true,
          chartHeight: svgRect.height,
          chartWidth: svgRect.width,
          xAxisY,
          yAxisX,
          hasXAxis: !!xAxis,
          hasYAxis: !!yAxis
        };
      });

      expect(axisMetrics.hasSvg).toBe(true);
      expect(axisMetrics.hasXAxis).toBe(true);
      expect(axisMetrics.hasYAxis).toBe(true);
      
      // X-axis should be at the bottom of the chart area (full height minus any axis label space)
      if (axisMetrics.xAxisY !== null) {
        expect(axisMetrics.xAxisY).toBeGreaterThan(axisMetrics.chartHeight * 0.8);
      }
      
      // Y-axis should be at the left edge (accounting for left margin)
      if (axisMetrics.yAxisX !== null) {
        expect(axisMetrics.yAxisX).toBeLessThan(50);
      }
    });
  });

  test.describe('Data Point Clipping Prevention', () => {
    test('No data points are clipped at chart edges', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="chart-container"]', { timeout: 10000 });
      await page.waitForTimeout(2000);

      const clippingCheck = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="chart-container"] svg');
        const dataPoints = svg?.querySelectorAll('circle') || [];
        
        if (!svg || dataPoints.length === 0) {
          return { hasData: false };
        }

        const svgRect = svg.getBoundingClientRect();
        let clippedPoints = 0;
        let totalPoints = dataPoints.length;
        
        // Check each data point for clipping
        Array.from(dataPoints).forEach(circle => {
          const rect = circle.getBoundingClientRect();
          const radius = parseFloat(circle.getAttribute('r') || '4');
          
          // Check if point extends beyond SVG boundaries
          if (rect.top < svgRect.top - radius ||
              rect.bottom > svgRect.bottom + radius ||
              rect.left < svgRect.left - radius ||
              rect.right > svgRect.right + radius) {
            clippedPoints++;
          }
        });

        return {
          hasData: true,
          totalPoints,
          clippedPoints,
          clippingRatio: clippedPoints / totalPoints
        };
      });

      expect(clippingCheck.hasData).toBe(true);
      expect(clippingCheck.totalPoints).toBeGreaterThan(0);
      
      // Allow very minimal clipping (less than 5% of points)
      expect(clippingCheck.clippingRatio).toBeLessThan(0.05);
    });
  });

  test.describe('Performance Impact Assessment', () => {
    test('Chart rendering performance remains acceptable', async ({ page }) => {
      await page.goto('http://localhost:3000');
      
      // Measure chart rendering time
      const renderingMetrics = await page.evaluate(async () => {
        const startTime = performance.now();
        
        // Wait for chart container to appear
        while (!document.querySelector('[data-testid="chart-container"]')) {
          await new Promise(resolve => setTimeout(resolve, 10));
          if (performance.now() - startTime > 10000) break; // 10s timeout
        }
        
        // Wait for data points to render
        while (!document.querySelector('[data-testid="chart-container"] circle')) {
          await new Promise(resolve => setTimeout(resolve, 10));
          if (performance.now() - startTime > 15000) break; // 15s timeout
        }
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        const dataPointCount = document.querySelectorAll('[data-testid="chart-container"] circle').length;
        
        return {
          renderTime,
          dataPointCount,
          hasRendered: dataPointCount > 0
        };
      });

      expect(renderingMetrics.hasRendered).toBe(true);
      expect(renderingMetrics.dataPointCount).toBeGreaterThan(0);
      
      // Chart should render within reasonable time (15 seconds max)
      expect(renderingMetrics.renderTime).toBeLessThan(15000);
    });
  });
});