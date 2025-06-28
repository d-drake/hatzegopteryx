# Test Screenshots Organization

This directory contains all test-related screenshots for the Hatzegopteryx project.

## Directory Structure

```
screenshots/
├── baseline/              # Visual regression baseline images (committed to git)
│   ├── desktop/          # Desktop viewport baselines (1024px+)
│   ├── mobile/           # Mobile viewport baselines (320-767px)
│   └── tablet/           # Tablet viewport baselines (768-1023px)
├── diff/                 # Visual regression diff images (gitignored)
├── failures/             # Test failure screenshots (gitignored)
│   ├── e2e/             # E2E test failures
│   ├── integration/     # Integration test failures
│   └── visual/          # Visual test failures
├── reports/              # Test report screenshots
│   ├── coverage/        # Coverage report images
│   └── performance/     # Performance test results
└── debug/               # Debug/development screenshots (gitignored)
```

## Usage Guidelines

### Baseline Images
- Store visual regression baseline images in `/baseline/`
- Organize by viewport size (desktop/tablet/mobile)
- These images are committed to version control
- Update baselines when intentional UI changes are made

### Test Failures
- Playwright automatically saves failure screenshots to `/failures/e2e/`
- Integration test failures go to `/failures/integration/`
- These are automatically cleaned up and not committed

### Visual Regression
- Baseline images: `/baseline/`
- Difference images: `/diff/` (when tests fail)
- Both are used by visual regression tools

### Development Screenshots
- Use `/debug/` for temporary development screenshots
- For extensive debugging, use `~/tmp/tests/playwright_png/` (outside project)

## Configuration

### Playwright Config
The `playwright.config.ts` is configured to output failures to `/screenshots/failures/e2e/`

### Visual Test Example
```javascript
test('responsive layout', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage-desktop.png', {
    fullPage: true,
    path: './screenshots/baseline/desktop/homepage-desktop.png'
  });
});
```

## Maintenance

### Cleaning Up
```bash
# Remove all failure screenshots
rm -rf screenshots/failures/**/*.png

# Remove all diff images
rm -rf screenshots/diff/**/*.png

# Remove debug screenshots
rm -rf screenshots/debug/**/*.png
```

### Updating Baselines
When UI changes are intentional:
```bash
# Update specific baseline
npx playwright test --update-snapshots path/to/test.spec.ts

# Update all baselines
npx playwright test --update-snapshots
```