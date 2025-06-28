const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Starting Variability Chart Statistical Tests...\n');

  // Helper function to calculate statistics
  const calculateStats = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    
    if (n === 0) return null;
    if (n === 1) return { single: sorted[0] };

    const q1Index = Math.floor(n * 0.25);
    const q2Index = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);

    const q1 = sorted[q1Index];
    const median = sorted[q2Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    const lowerWhisker = q1 - 1.5 * iqr;
    const upperWhisker = q3 + 1.5 * iqr;
    
    const mean = values.reduce((a, b) => a + b, 0) / n;
    
    const outliers = values.filter(v => v < lowerWhisker || v > upperWhisker);
    const minNonOutlier = sorted.find(v => v >= lowerWhisker) || q1;
    const maxNonOutlier = sorted.reverse().find(v => v <= upperWhisker) || q3;

    return {
      n,
      mean,
      median,
      q1,
      q3,
      iqr,
      minNonOutlier,
      maxNonOutlier,
      outliers,
      lowerWhisker,
      upperWhisker
    };
  };

  try {
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForLoadState('networkidle');
    
    // Switch to Variability tab
    await page.click('button:has-text("Variability")');
    await page.waitForTimeout(1000);

    // Test 1: Verify statistical calculations for each entity
    console.log('Testing statistical calculations...\n');
    
    const entityStats = await page.evaluate(() => {
      const results = {};
      const entities = ['FAKE_TOOL1', 'FAKE_TOOL2', 'FAKE_TOOL3', 'FAKE_TOOL4', 'FAKE_TOOL5', 'FAKE_TOOL6'];
      
      entities.forEach(entity => {
        const boxPlot = document.querySelector(`[data-entity="${entity}"]`);
        if (!boxPlot) return;

        // Extract displayed statistics from DOM
        const stats = {
          displayed: {
            median: parseFloat(boxPlot.querySelector('.median-line')?.getAttribute('y1')),
            q1: parseFloat(boxPlot.querySelector('.box')?.getAttribute('y')),
            q3: parseFloat(boxPlot.querySelector('.box')?.getAttribute('y')) + 
                parseFloat(boxPlot.querySelector('.box')?.getAttribute('height')),
            mean: boxPlot.querySelector('.mean-marker')?.getAttribute('cy'),
            whiskerLower: parseFloat(boxPlot.querySelector('.whisker-lower')?.getAttribute('y2')),
            whiskerUpper: parseFloat(boxPlot.querySelector('.whisker-upper')?.getAttribute('y1'))
          },
          dataPoints: Array.from(boxPlot.querySelectorAll('.data-point')).map(p => ({
            value: parseFloat(p.getAttribute('data-value')),
            isOutlier: p.classList.contains('outlier')
          }))
        };
        
        results[entity] = stats;
      });
      
      return results;
    });

    // Test 2: Verify outlier detection
    console.log('Testing outlier detection...');
    
    const outlierTests = await page.evaluate(() => {
      const outliers = document.querySelectorAll('.data-point.outlier');
      return Array.from(outliers).map(outlier => ({
        entity: outlier.closest('[data-entity]')?.getAttribute('data-entity'),
        value: parseFloat(outlier.getAttribute('data-value')),
        color: window.getComputedStyle(outlier).fill
      }));
    });

    // Test 3: Single point entities
    console.log('Testing single-point entity handling...');
    
    // Apply filter to create single-point scenario
    // Find date input fields
    const dateInputs = await page.$$('input[type="date"]');
    if (dateInputs.length >= 2) {
      // Fill start and end dates with same value
      await dateInputs[0].fill('2024-06-01');
      await dateInputs[1].fill('2024-06-01');
      await page.waitForTimeout(1000);
    }

    const singlePointHandling = await page.evaluate(() => {
      const entities = document.querySelectorAll('[data-entity]');
      const results = [];
      
      entities.forEach(entity => {
        const points = entity.querySelectorAll('.data-point');
        const hasBox = entity.querySelector('.box') !== null;
        
        results.push({
          entity: entity.getAttribute('data-entity'),
          pointCount: points.length,
          hasBox: hasBox,
          correctDisplay: (points.length === 1 && !hasBox) || (points.length > 1 && hasBox)
        });
      });
      
      return results;
    });

    // Test 4: Empty entity handling
    console.log('Testing empty entity handling...');
    
    // Apply very restrictive date filter to get no data
    const dateInputs2 = await page.$$('input[type="date"]');
    if (dateInputs2.length >= 2) {
      // Use a date with no data
      await dateInputs2[0].fill('2020-01-01');
      await dateInputs2[1].fill('2020-01-01');
      await page.waitForTimeout(1000);
    }

    const emptyEntityHandling = await page.evaluate(() => {
      const allEntities = ['FAKE_TOOL1', 'FAKE_TOOL2', 'FAKE_TOOL3', 'FAKE_TOOL4', 'FAKE_TOOL5', 'FAKE_TOOL6'];
      const displayedEntities = Array.from(document.querySelectorAll('[data-entity]'))
        .map(e => e.getAttribute('data-entity'));
      
      return {
        expectedEntities: allEntities,
        displayedEntities,
        correctlyOmitted: allEntities.filter(e => !displayedEntities.includes(e))
      };
    });

    // Test 5: Statistical accuracy verification
    console.log('Testing statistical accuracy...');
    
    // Reset filters by clicking Clear All button
    const clearButton = await page.$('button:has-text("Clear All")');
    if (clearButton) {
      await clearButton.click();
      await page.waitForTimeout(1000);
    }

    const accuracyTest = await page.evaluate(() => {
      // Get raw data values for first entity
      const firstEntity = document.querySelector('[data-entity="FAKE_TOOL1"]');
      if (!firstEntity) return null;

      const values = Array.from(firstEntity.querySelectorAll('.data-point'))
        .map(p => parseFloat(p.getAttribute('data-value')));

      // Get displayed statistics
      const displayed = {
        mean: parseFloat(firstEntity.querySelector('.mean-marker')?.getAttribute('data-mean')),
        median: parseFloat(firstEntity.querySelector('.median-line')?.getAttribute('data-median')),
        q1: parseFloat(firstEntity.querySelector('.box')?.getAttribute('data-q1')),
        q3: parseFloat(firstEntity.querySelector('.box')?.getAttribute('data-q3'))
      };

      return { values, displayed };
    });

    // Calculate expected statistics and compare
    if (accuracyTest && accuracyTest.values.length > 0) {
      const expected = calculateStats(accuracyTest.values);
      console.log('\nStatistical Accuracy Check:');
      console.log(`  Mean - Expected: ${expected.mean.toFixed(3)}, Displayed: ${accuracyTest.displayed.mean?.toFixed(3)}`);
      console.log(`  Median - Expected: ${expected.median.toFixed(3)}, Displayed: ${accuracyTest.displayed.median?.toFixed(3)}`);
      console.log(`  Q1 - Expected: ${expected.q1.toFixed(3)}, Displayed: ${accuracyTest.displayed.q1?.toFixed(3)}`);
      console.log(`  Q3 - Expected: ${expected.q3.toFixed(3)}, Displayed: ${accuracyTest.displayed.q3?.toFixed(3)}`);
    }

    // Print test results
    console.log('\n=== Statistical Test Results ===\n');

    console.log('Outlier Detection:');
    console.log(`  Total outliers found: ${outlierTests.length}`);
    console.log(`  All outliers colored #ff4545: ${outlierTests.every(o => o.color === 'rgb(255, 69, 69)')}`);

    console.log('\nSingle Point Handling:');
    singlePointHandling.forEach(result => {
      console.log(`  ${result.entity}: ${result.pointCount} points, Box shown: ${result.hasBox}, Correct: ${result.correctDisplay}`);
    });

    console.log('\nEmpty Entity Handling:');
    console.log(`  Entities with no data omitted: ${emptyEntityHandling.correctlyOmitted.length > 0}`);
    console.log(`  Omitted entities: ${emptyEntityHandling.correctlyOmitted.join(', ') || 'None'}`);

  } catch (error) {
    console.error('Test error:', error);
  }

  await browser.close();
})();