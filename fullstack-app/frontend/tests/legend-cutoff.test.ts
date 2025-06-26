/**
 * Test for verifying and fixing legend cutoff issues in Timeline charts
 */

describe('Timeline Legend Cutoff Test', () => {
  beforeEach(async () => {
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for animations
  });

  test('Legend items should be fully visible within chart bounds', async () => {
    // Find all SVG elements (charts)
    const svgElements = await page.$$('svg');
    
    for (let i = 0; i < svgElements.length; i++) {
      const svg = svgElements[i];
      const svgBox = await svg.boundingBox();
      
      if (!svgBox) continue;
      
      // Check legend text elements
      const legendTexts = await svg.$$('text');
      
      for (const text of legendTexts) {
        const textContent = await text.textContent();
        
        // Skip axis labels and focus on legend items
        if (textContent && (
          textContent.includes('bias') || 
          textContent.includes('property') || 
          textContent.includes('FAKE') ||
          textContent.includes('FP1_')
        )) {
          const textBox = await text.boundingBox();
          
          if (textBox) {
            // Check if text extends beyond SVG boundaries
            const isWithinBounds = textBox.x + textBox.width <= svgBox.x + svgBox.width;
            
            expect(isWithinBounds).toBe(true, 
              `Legend item "${textContent}" extends beyond chart boundary by ${
                (textBox.x + textBox.width) - (svgBox.x + svgBox.width)
              }px`
            );
          }
        }
      }
    }
  });

  test('Chart container should have sufficient width for legends', async () => {
    // Check the chart containers
    const chartContainers = await page.$$('div.bg-white.p-4.rounded-lg.shadow');
    
    for (const container of chartContainers) {
      const containerBox = await container.boundingBox();
      const svg = await container.$('svg');
      
      if (svg && containerBox) {
        const svgWidth = await svg.evaluate(el => el.getAttribute('width'));
        const totalRequiredWidth = parseInt(svgWidth || '800') + 50; // SVG width + buffer
        
        expect(containerBox.width).toBeGreaterThanOrEqual(totalRequiredWidth,
          'Container width should accommodate chart and legends'
        );
      }
    }
  });

  test('Legend positioning should account for margin space', async () => {
    // Check legend transform positions
    const svgElements = await page.$$('svg');
    
    for (const svg of svgElements) {
      const svgWidth = await svg.evaluate(el => parseInt(el.getAttribute('width') || '800'));
      const legendGroups = await svg.$$('g');
      
      for (const group of legendGroups) {
        const transform = await group.evaluate(el => el.getAttribute('transform'));
        
        if (transform && transform.includes('translate')) {
          const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
          
          if (match) {
            const translateX = parseFloat(match[1]);
            
            // Check if legend has text content
            const hasLegendText = await group.evaluate(el => {
              const texts = el.querySelectorAll('text');
              return Array.from(texts).some(t => 
                t.textContent?.includes('bias') || 
                t.textContent?.includes('property') ||
                t.textContent?.includes('FAKE')
              );
            });
            
            if (hasLegendText) {
              // Legend should not start beyond ~70% of SVG width to leave room for text
              const maxStartPosition = svgWidth * 0.7;
              
              expect(translateX).toBeLessThanOrEqual(maxStartPosition,
                `Legend positioned too far right at x=${translateX}, max should be ${maxStartPosition}`
              );
            }
          }
        }
      }
    }
  });
});

// Test to verify the fix works
describe('Legend Cutoff Fix Verification', () => {
  test('After fix: All legend items should be fully visible', async () => {
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot for documentation
    await page.screenshot({ 
      path: 'legend-cutoff-after-fix.png',
      fullPage: true 
    });
    
    // Verify no text is cut off
    const cutoffIssues = await page.evaluate(() => {
      const issues = [];
      const svgs = document.querySelectorAll('svg');
      
      svgs.forEach((svg, svgIndex) => {
        const svgRect = svg.getBoundingClientRect();
        const texts = svg.querySelectorAll('text');
        
        texts.forEach(text => {
          const content = text.textContent || '';
          if (content.includes('bias') || 
              content.includes('property') || 
              content.includes('FAKE')) {
            const textRect = text.getBoundingClientRect();
            
            if (textRect.right > svgRect.right) {
              issues.push({
                svgIndex,
                text: content,
                overflow: textRect.right - svgRect.right
              });
            }
          }
        });
      });
      
      return issues;
    });
    
    expect(cutoffIssues).toHaveLength(0);
  });
});