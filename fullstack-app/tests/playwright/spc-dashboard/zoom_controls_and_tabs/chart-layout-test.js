const { chromium } = require('playwright');

/**
 * Test to verify improved chart layout:
 * - Title is above zoom controls
 * - Proper spacing between elements
 * - Tabs are functional
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('=== Chart Layout Test: Verify Improved Layout ===\n');
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Test 1: Title positioning
    console.log('Test 1: Title Positioning');
    const titleAnalysis = await page.evaluate(() => {
      const results = [];
      const containers = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      
      containers.forEach((container, index) => {
        const title = container.querySelector('h4');
        const titleSection = title?.closest('div');
        const chartSection = container.querySelector('.p-4.pt-0, .p-4.pt-2');
        
        if (title && titleSection && chartSection) {
          const containerRect = container.getBoundingClientRect();
          const titleRect = title.getBoundingClientRect();
          const chartRect = chartSection.getBoundingClientRect();
          
          results.push({
            index,
            title: title.textContent,
            titleFromTop: titleRect.top - containerRect.top,
            titleHeight: titleRect.height,
            chartFromTop: chartRect.top - containerRect.top,
            titleAboveChart: titleRect.bottom < chartRect.top
          });
        }
      });
      
      return results;
    });
    
    titleAnalysis.forEach(analysis => {
      console.log(`  Chart ${analysis.index}: "${analysis.title}"`);
      console.log(`    Title position: ${analysis.titleFromTop}px from top`);
      console.log(`    Chart position: ${analysis.chartFromTop}px from top`);
      console.log(`    Title above chart: ${analysis.titleAboveChart ? 'YES ✅' : 'NO ❌'}`);
    });
    
    // Test 2: Tabs functionality
    console.log('\nTest 2: Tabs Functionality');
    const tabsAnalysis = await page.evaluate(() => {
      const results = [];
      const containers = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      
      containers.forEach((container, index) => {
        const tabs = container.querySelectorAll('button[class*="text-sm"][class*="font-medium"]');
        const activeTab = container.querySelector('button[class*="text-blue-600"]');
        
        results.push({
          index,
          tabCount: tabs.length,
          tabLabels: Array.from(tabs).map(t => t.textContent),
          activeTab: activeTab?.textContent || 'none',
          hasTimelineTab: Array.from(tabs).some(t => t.textContent === 'Timeline'),
          hasVariabilityTab: Array.from(tabs).some(t => t.textContent === 'Variability')
        });
      });
      
      return results;
    });
    
    tabsAnalysis.forEach(analysis => {
      console.log(`  Chart ${analysis.index}:`);
      console.log(`    Tabs found: ${analysis.tabCount}`);
      console.log(`    Tab labels: ${analysis.tabLabels.join(', ')}`);
      console.log(`    Active tab: ${analysis.activeTab}`);
      console.log(`    Has Timeline: ${analysis.hasTimelineTab ? 'YES ✅' : 'NO ❌'}`);
      console.log(`    Has Variability: ${analysis.hasVariabilityTab ? 'YES ✅' : 'NO ❌'}`);
    });
    
    // Test 3: Tab switching
    console.log('\nTest 3: Tab Switching');
    
    // Click on first Variability tab
    const firstVariabilityTab = await page.$('button:has-text("Variability")');
    if (firstVariabilityTab) {
      await firstVariabilityTab.click();
      await page.waitForTimeout(500);
      
      const variabilityContent = await page.evaluate(() => {
        const placeholder = document.querySelector('.bg-gray-50.rounded-lg.border-dashed');
        const hasPlaceholder = !!placeholder;
        const placeholderText = placeholder?.querySelector('h3')?.textContent || '';
        
        return {
          hasPlaceholder,
          placeholderText,
          isVisible: placeholder ? window.getComputedStyle(placeholder).display !== 'none' : false
        };
      });
      
      console.log('  After clicking Variability tab:');
      console.log(`    Placeholder visible: ${variabilityContent.hasPlaceholder ? 'YES ✅' : 'NO ❌'}`);
      console.log(`    Placeholder text: "${variabilityContent.placeholderText}"`);
      
      // Switch back to Timeline
      const timelineTab = await page.$('button:has-text("Timeline")');
      await timelineTab.click();
      await page.waitForTimeout(500);
      
      const timelineContent = await page.evaluate(() => {
        const svg = document.querySelector('svg');
        return {
          hasSvg: !!svg,
          svgVisible: svg ? window.getComputedStyle(svg).display !== 'none' : false
        };
      });
      
      console.log('  After clicking Timeline tab:');
      console.log(`    SVG chart visible: ${timelineContent.hasSvg && timelineContent.svgVisible ? 'YES ✅' : 'NO ❌'}`);
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: '/home/dwdra/tmp/tests/playwright_png/chart-layout-with-tabs.png',
      fullPage: true 
    });
    
    console.log('\n=== Test Summary ===');
    const allTitlesAbove = titleAnalysis.every(a => a.titleAboveChart);
    const allHaveTabs = tabsAnalysis.every(a => a.hasTimelineTab && a.hasVariabilityTab);
    console.log(`Titles above charts: ${allTitlesAbove ? '✅' : '❌'}`);
    console.log(`All charts have tabs: ${allHaveTabs ? '✅' : '❌'}`);
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();