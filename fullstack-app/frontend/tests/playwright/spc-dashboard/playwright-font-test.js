const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Inject a test to measure text precisely
    const textMeasurements = await page.evaluate(() => {
      const measurements = [];
      
      // Find the specific "fake property1" text
      document.querySelectorAll('text').forEach(text => {
        const content = text.textContent || '';
        if (content === 'fake property1' || content.includes('FP1_')) {
          // Create a test span with the same font properties
          const testSpan = document.createElement('span');
          testSpan.style.position = 'absolute';
          testSpan.style.visibility = 'hidden';
          testSpan.style.whiteSpace = 'nowrap';
          
          // Copy computed styles from SVG text
          const computedStyle = window.getComputedStyle(text);
          testSpan.style.fontSize = computedStyle.fontSize;
          testSpan.style.fontFamily = computedStyle.fontFamily;
          testSpan.style.fontWeight = computedStyle.fontWeight;
          testSpan.textContent = content;
          
          document.body.appendChild(testSpan);
          const spanWidth = testSpan.offsetWidth;
          document.body.removeChild(testSpan);
          
          // Get various measurements
          const bbox = text.getBBox();
          const ctm = text.getCTM();
          const screenCTM = text.getScreenCTM();
          
          measurements.push({
            text: content,
            fontSize: computedStyle.fontSize,
            fontFamily: computedStyle.fontFamily,
            svgBBoxWidth: bbox.width,
            svgBBoxX: bbox.x,
            htmlSpanWidth: spanWidth,
            computedTextLength: text.getComputedTextLength(),
            textLength: text.textLength.baseVal.value,
            ctm: ctm ? { a: ctm.a, e: ctm.e } : null,
            screenCTM: screenCTM ? { a: screenCTM.a, e: screenCTM.e } : null
          });
        }
      });
      
      return measurements;
    });
    
    console.log('Text measurements:');
    textMeasurements.forEach(m => {
      console.log(`\n"${m.text}":`);
      console.log(`  Font: ${m.fontSize} ${m.fontFamily}`);
      console.log(`  SVG BBox: x=${m.svgBBoxX}, width=${m.svgBBoxWidth}`);
      console.log(`  Computed text length: ${m.computedTextLength}`);
      console.log(`  HTML span width: ${m.htmlSpanWidth}px`);
      if (m.ctm) {
        console.log(`  CTM scale: ${m.ctm.a}, translate: ${m.ctm.e}`);
      }
    });
    
    // Check if we need to increase the margin
    const requiredMargin = await page.evaluate(() => {
      let maxEndX = 0;
      const svgWidth = 880;
      
      document.querySelectorAll('svg').forEach(svg => {
        svg.querySelectorAll('text').forEach(text => {
          const content = text.textContent || '';
          if (content.includes('property') || content.includes('FP1_')) {
            const bbox = text.getBBox();
            const ctm = text.getCTM();
            if (ctm) {
              const endX = ctm.e + bbox.x + bbox.width;
              maxEndX = Math.max(maxEndX, endX);
            }
          }
        });
      });
      
      const currentMargin = 280;
      const innerWidth = svgWidth - 70 - currentMargin; // 530
      const overflow = maxEndX - svgWidth;
      const additionalMarginNeeded = overflow > 0 ? Math.ceil(overflow / 10) * 10 : 0;
      
      return {
        maxEndX,
        svgWidth,
        overflow,
        currentMargin,
        suggestedMargin: currentMargin + additionalMarginNeeded
      };
    });
    
    console.log('\nMargin analysis:');
    console.log(`Maximum text end position: ${requiredMargin.maxEndX}px`);
    console.log(`SVG width: ${requiredMargin.svgWidth}px`);
    console.log(`Overflow: ${requiredMargin.overflow}px`);
    console.log(`Current right margin: ${requiredMargin.currentMargin}px`);
    console.log(`Suggested right margin: ${requiredMargin.suggestedMargin}px`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();