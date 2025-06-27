# Test Migration Note

## Removed Browser Automation Tests (2025-06-26)
The following test files were removed as they depended on puppeteer/browser automation:
- component-specific.test.ts
- frontend-health.test.ts  
- plan-verification.test.ts
- sentry-integration.test.ts
- setup.ts
- legend-cutoff.test.ts

## Current Testing Strategy
1. **Unit Tests** - Jest-based tests for component logic (no browser required)
2. **Playwright MCP** - Use mcp__playwright__* tools in Claude for browser testing
3. **Playwright Direct** - Fallback option when MCP is not performing well

## Working Tests
The following tests work without browser automation:
- unit.test.ts - Basic unit tests (data transformations, utilities, calculations)

## Running Tests
```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```