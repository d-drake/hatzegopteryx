# End-to-End Tests with Playwright

This directory contains end-to-end tests for the Hatzegopteryx frontend application using Playwright.

## Test Structure

```
e2e/
├── README.md                    # This file
├── frontend-health.spec.ts      # Basic health checks and page loading tests
├── component-interaction.spec.ts # Component interaction and functionality tests
├── sentry-integration.spec.ts   # Sentry error tracking verification
├── visual-regression.spec.ts    # Visual regression tests for charts and layouts
├── helpers/
│   └── test-utils.ts           # Common test utilities and helper functions
└── screenshots/                # Visual regression screenshots (gitignored)
```

## Running Tests

### Prerequisites

Make sure the application is running:
```bash
# From the project root
docker compose up

# Or run the frontend separately
cd fullstack-app/frontend
npm run dev
```

### Test Commands

```bash
# Run all e2e tests
npm run test:e2e

# Run tests in UI mode (recommended for development)
npm run test:e2e:ui

# Run tests with visible browser
npm run test:e2e:headed

# Debug a specific test
npm run test:e2e:debug

# Run a specific test file
npx playwright test e2e/frontend-health.spec.ts

# Run tests for a specific project (browser)
npx playwright test --project=chromium
```

### Viewing Test Reports

After running tests, view the HTML report:
```bash
npm run test:e2e:report
```

## Test Categories

### 1. Frontend Health Checks (`frontend-health.spec.ts`)
- Page loading without errors
- Navigation between pages
- API connectivity
- Responsive design basics

### 2. Component Interactions (`component-interaction.spec.ts`)
- Items CRUD operations
- CD Data display and pagination
- SPC Dashboard interactions
- Chart zoom and legend interactions
- Tooltip functionality

### 3. Sentry Integration (`sentry-integration.spec.ts`)
- Sentry initialization
- Error capture verification
- Performance monitoring
- Navigation tracking

### 4. Visual Regression (`visual-regression.spec.ts`)
- Legend rendering at different viewport sizes
- Chart layout and spacing
- Control limits visualization
- Responsive behavior
- Zoom functionality visual tests

## Writing New Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test';
import { navigateToSPCDashboard, waitForSPCDashboard } from './helpers/test-utils';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Navigate to page
    await navigateToSPCDashboard(page);
    
    // Perform actions
    await page.click('button');
    
    // Assert results
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Using Test Utilities

The `helpers/test-utils.ts` file provides common functions:

- `waitForSPCDashboard()` - Wait for dashboard to fully load
- `navigateToSPCDashboard()` - Navigate to specific SPC monitor/product
- `clickLegendItem()` - Interact with legend items
- `zoomChart()` - Perform zoom actions
- `takeScreenshot()` - Take consistent screenshots
- `isFullyVisible()` - Check element visibility

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Wait for network idle** when testing data-dependent features
3. **Use page objects** for complex interactions
4. **Take screenshots** for visual debugging
5. **Mock external APIs** when testing specific features in isolation
6. **Run tests in parallel** for faster execution
7. **Use descriptive test names** that explain what is being tested

## Debugging

### Debug Mode
```bash
npm run test:e2e:debug
```

### View Browser
```bash
npm run test:e2e:headed
```

### Trace Viewer
Playwright automatically captures traces on failure. View them:
```bash
npx playwright show-trace trace.zip
```

### VS Code Extension
Install the Playwright Test for VS Code extension for:
- Running tests from the editor
- Debugging with breakpoints
- Generating tests with codegen

## CI/CD Integration

The tests are configured to run in CI with:
- Headless mode
- Parallel execution disabled
- Retry on failure (2 attempts)
- Artifacts collection on failure

## Troubleshooting

### Tests fail with "Target closed"
- Ensure the application is running on http://localhost:3000
- Check that all services are healthy: `docker compose ps`

### Visual tests fail
- Screenshots are environment-dependent
- Update baseline screenshots when intentional changes are made
- Use `--update-snapshots` flag to update baselines

### Timeout errors
- Increase timeout in playwright.config.ts
- Check network conditions
- Ensure backend services are responsive