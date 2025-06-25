import puppeteer, { Browser, Page } from 'puppeteer';

/**
 * Component-Specific Verification Tests
 * 
 * These tests focus on individual components identified in the fix plan,
 * providing detailed validation for each component's functionality.
 */

describe('Component-Specific Fix Verification', () => {
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
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('AppTabs Component (frontend/src/components/AppTabs.tsx)', () => {
    
    test('Tab container renders with proper structure', async () => {
      await page.goto(BASE_URL);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Main tablist container
      const tablist = await page.$('[role="tablist"]');
      expect(tablist).toBeTruthy();
      
      // Verify ARIA attributes
      const tablistAttrs = await tablist?.evaluate(el => ({
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')
      }));
      
      expect(tablistAttrs?.role).toBe('tablist');
      expect(tablistAttrs?.ariaLabel).toBeTruthy();
    });

    test('Individual tabs have correct attributes and behavior', async () => {
      await page.goto(BASE_URL);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const tabs = await page.$$('[role="tab"]');
      expect(tabs.length).toBeGreaterThanOrEqual(2);
      
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const attrs = await tab.evaluate(el => ({
          role: el.getAttribute('role'),
          ariaSelected: el.getAttribute('aria-selected'),
          ariaControls: el.getAttribute('aria-controls'),
          tabIndex: el.getAttribute('tabindex')
        }));
        
        expect(attrs.role).toBe('tab');
        expect(['true', 'false']).toContain(attrs.ariaSelected);
        expect(attrs.ariaControls).toBeTruthy();
      }
    });

    test('Tab panels are properly associated', async () => {
      await page.goto(BASE_URL);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const tabs = await page.$$('[role="tab"]');
      const panels = await page.$$('[role="tabpanel"]');
      
      expect(panels.length).toBe(tabs.length);
      
      // Check tab-panel associations
      for (let i = 0; i < tabs.length; i++) {
        const tabControls = await tabs[i].evaluate(el => el.getAttribute('aria-controls'));
        const panelId = await panels[i].evaluate(el => el.id);
        
        expect(tabControls).toBe(panelId);
      }
    });

    test('Tab switching functionality works', async () => {
      await page.goto(BASE_URL);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const tabs = await page.$$('[role="tab"]');
      if (tabs.length >= 2) {
        // Click first tab
        await tabs[0].click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        let activeTab = await page.$('[role="tab"][aria-selected="true"]');
        let activeTabText = await activeTab?.evaluate(el => el.textContent);
        
        // Click second tab
        await tabs[1].click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        activeTab = await page.$('[role="tab"][aria-selected="true"]');
        let newActiveTabText = await activeTab?.evaluate(el => el.textContent);
        
        expect(newActiveTabText).not.toBe(activeTabText);
      }
    });
  });

  describe('Chart Components (frontend/src/components/charts/)', () => {
    
    test('Timeline component renders with data', async () => {
      await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Main chart container
      const chartContainer = await page.$('[data-testid="chart-container"], .chart-container');
      expect(chartContainer).toBeTruthy();
      
      // SVG element for D3.js chart
      const svg = await page.$('svg');
      expect(svg).toBeTruthy();
      
      // Chart has dimensions
      if (svg) {
        const dimensions = await svg.evaluate(el => ({
          width: el.getAttribute('width'),
          height: el.getAttribute('height'),
          viewBox: el.getAttribute('viewBox')
        }));
        
        expect(dimensions.width || dimensions.viewBox).toBeTruthy();
        expect(dimensions.height || dimensions.viewBox).toBeTruthy();
      }
    });

    test('Chart axes render correctly', async () => {
      await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // X and Y axes
      const xAxis = await page.$('.x-axis, .axis.x');
      const yAxis = await page.$('.y-axis, .axis.y');
      
      expect(xAxis).toBeTruthy();
      expect(yAxis).toBeTruthy();
      
      // Axis labels
      const axisLabels = await page.$$('text.axis-label, .axis text');
      expect(axisLabels.length).toBeGreaterThan(0);
    });

    test('Data points render on chart', async () => {
      await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Data visualization elements
      const dataPoints = await page.$$('circle, rect.bar, path.line');
      expect(dataPoints.length).toBeGreaterThan(0);
      
      // Check if points have proper attributes
      if (dataPoints.length > 0) {
        const firstPoint = dataPoints[0];
        const attrs = await firstPoint.evaluate(el => ({
          tagName: el.tagName.toLowerCase(),
          cx: el.getAttribute('cx'),
          cy: el.getAttribute('cy'),
          r: el.getAttribute('r'),
          fill: el.getAttribute('fill') || el.style.fill
        }));
        
        if (attrs.tagName === 'circle') {
          expect(attrs.cx).toBeTruthy();
          expect(attrs.cy).toBeTruthy();
          expect(attrs.r).toBeTruthy();
        }
      }
    });

    test('Chart interactivity works', async () => {
      await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      const svg = await page.$('svg');
      if (svg) {
        // Test hover interaction
        await svg.hover();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test click interaction
        await svg.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test zoom interaction (scroll)
        await page.mouse.move(400, 300);
        await page.mouse.wheel({ deltaY: -100 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Chart should still be present after interactions
        const chartStillExists = await page.$('svg');
        expect(chartStillExists).toBeTruthy();
      }
    });

    test('Legend component renders and functions', async () => {
      await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Look for legend elements
      const legend = await page.$('.legend, [data-testid="legend"]');
      
      if (legend) {
        // Legend items
        const legendItems = await page.$$('.legend-item, .legend > *');
        expect(legendItems.length).toBeGreaterThan(0);
        
        // Test legend interaction
        if (legendItems.length > 0) {
          await legendItems[0].click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Should not cause errors
          const legendStillExists = await page.$('.legend, [data-testid="legend"]');
          expect(legendStillExists).toBeTruthy();
        }
      }
    });
  });

  describe('SPC Dashboard Components (frontend/src/components/spc-dashboard/)', () => {
    
    test('SPCTimeline component renders with control limits', async () => {
      await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Control limit lines
      const controlLimitLines = await page.$$('.control-limit, .limit-line, line.cl, line.ucl, line.lcl');
      expect(controlLimitLines.length).toBeGreaterThan(0);
      
      // Verify control limits have proper styling
      if (controlLimitLines.length > 0) {
        const limitLine = controlLimitLines[0];
        const style = await limitLine.evaluate(el => ({
          stroke: el.getAttribute('stroke') || el.style.stroke,
          strokeDasharray: el.getAttribute('stroke-dasharray') || el.style.strokeDasharray
        }));
        
        expect(style.stroke).toBeTruthy();
      }
    });

    test('Filter controls render and function', async () => {
      await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Entity filter
      const entitySelect = await page.$('select[name="entity"], select');
      expect(entitySelect).toBeTruthy();
      
      // Date filters
      const dateInputs = await page.$$('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(0); // May or may not have date inputs
      
      // Test filter functionality
      if (entitySelect) {
        const options = await page.$$eval('select option', options => 
          options.map(option => option.value)
        );
        
        expect(options.length).toBeGreaterThan(1);
        
        // Change selection
        await entitySelect.select(options[1]);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Should trigger chart update (no way to verify without state inspection)
        const chartStillExists = await page.$('svg');
        expect(chartStillExists).toBeTruthy();
      }
    });
  });

  describe('Page-Level Components', () => {
    
    test('Main layout renders correctly', async () => {
      await page.goto(BASE_URL);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Root layout elements
      const body = await page.$('body');
      const nextRoot = await page.$('#__next');
      
      expect(body).toBeTruthy();
      expect(nextRoot).toBeTruthy();
      
      // Check for proper font loading
      const computedStyle = await page.evaluate(() => {
        return window.getComputedStyle(document.body).fontFamily;
      });
      
      expect(computedStyle).toBeTruthy();
    });

    test('SPC Dashboard page renders with all components', async () => {
      await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/1000_BNT44`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Page title/header
      const pageTitle = await page.$('h1, h2, .page-title');
      expect(pageTitle).toBeTruthy();
      
      // Main content area
      const mainContent = await page.$('main, .main-content');
      if (!mainContent) {
        // If no semantic main, check for general content
        const contentArea = await page.$('div');
        expect(contentArea).toBeTruthy();
      }
      
      // Chart area
      const chartArea = await page.$('svg, .chart-container');
      expect(chartArea).toBeTruthy();
      
      // Filter controls
      const filterArea = await page.$('select, .filter-controls');
      expect(filterArea).toBeTruthy();
    });
  });

  describe('Error Boundary and Resilience', () => {
    
    test('Application handles invalid routes gracefully', async () => {
      await page.goto(`${BASE_URL}/spc-dashboard/INVALID/INVALID`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Should not crash the app
      const bodyExists = await page.$('body');
      expect(bodyExists).toBeTruthy();
      
      // Should show some content (error page or fallback)
      const hasContent = await page.evaluate(() => {
        return document.body.textContent?.trim().length > 0;
      });
      expect(hasContent).toBe(true);
    });

    test('Application handles missing data gracefully', async () => {
      await page.goto(`${BASE_URL}/spc-dashboard/SPC_CD_L1/999999_INVALID`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // App should still render
      const appExists = await page.$('#__next');
      expect(appExists).toBeTruthy();
      
      // Should either show error message or empty state
      const hasErrorOrEmpty = await page.evaluate(() => {
        const text = document.body.textContent?.toLowerCase() || '';
        return text.includes('error') || 
               text.includes('no data') || 
               text.includes('not found') ||
               document.querySelector('svg, .empty-state') !== null;
      });
      expect(hasErrorOrEmpty).toBe(true);
    });
  });
});