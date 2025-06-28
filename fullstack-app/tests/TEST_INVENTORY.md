# Test Inventory After Reorganization

## Summary
- **Total Tests Kept**: ~35 files (down from ~90)
- **Tests Removed**: ~55 files (outdated security tests, duplicates, debug tests)

## Test Structure

### E2E Tests (`/tests/e2e/`)

#### Smoke Tests (`/tests/e2e/smoke/`)
- `full-app.e2e.js` - Comprehensive application test
- `full-e2e-test.js` - Full functionality test
- `focused-e2e-test.js` - Focused feature test
- `frontend-health.spec.ts` - Frontend health check

#### User Journeys (`/tests/e2e/user-journeys/`)
- `api-optimization.spec.ts` - API performance optimization
- `component-interaction.spec.ts` - Component interaction flows

#### SPC Dashboard (`/tests/e2e/spc-dashboard/`)
- `zoom-sync.e2e.js` - Zoom synchronization
- `zoom-sync-final-test.js` - Final zoom sync implementation
- `bidirectional-zoom-sync-test.js` - Bidirectional zoom
- `zoom-controls.e2e.js` - Zoom controls comprehensive test
- `zoom-controls-e2e.js` - Zoom controls E2E
- `final-zoom-controls-test.js` - Final zoom controls
- `layout.e2e.js` - Side-by-side layout
- `comprehensive-overflow-test.js` - Overflow handling
- `margin-and-rotation-test.js` - Margin and rotation
- `final-margin-rotation-test.js` - Final margin/rotation
- `zoom-controls-integration.e2e.js` - Zoom controls integration
- `responsive-layout.e2e.js` - Responsive layout test
- `svg-requirements.e2e.js` - SVG requirements verification
- `variability-chart/` - Variability chart test suite
  - `interaction-tests.js`
  - `layout-tests.js`
  - `statistical-tests.js`

### Integration Tests (`/tests/integration/`)

#### Frontend (`/tests/integration/frontend/`)
- `sentry-integration.spec.ts` - Sentry error tracking
- `container-overflow-test.js` - Container overflow
- `overflow-fix-test.js` - Overflow fixes
- `responsive-wrapper-test.js` - Responsive wrapper
- `detailed-margin-test.js` - Detailed margin testing
- `svg-responsive.test.js` - SVG responsive behavior
- `zoom-controls/comprehensive-fixes-test.js` - Zoom fixes
- `legend/test-reset-button-clipping.js` - Legend functionality

### Unit Tests (`/tests/unit/`)

#### Frontend (`/tests/unit/frontend/`)
- `app.test.ts` - Basic app unit test

### Visual Tests (`/tests/visual/`)
- `visual-regression.spec.ts` - Visual regression suite
- `spc-layout.visual.js` - SPC layout visual test
- `svg-rendering.visual.js` - SVG rendering visual test
- `screenshots/` - Visual test screenshots

### Test Helpers (`/tests/helpers/`)
- `sentry-mcp-helper.spec.ts` - Sentry test helper
- `e2e/` - E2E test helpers

### Documentation
- `README.md` - Test documentation
- `SENTRY_TESTING.md` - Sentry testing guide

## Tests Removed

### Outdated Security Tests (25+ files)
- All files in `/tests/playwright/security/`
- All `security-*.spec.ts` files in `/e2e/`
- `admin-functionality-test.js`
- `comprehensive-security-test.js`

### Debug/Manual Tests (30+ files)
- All `debug-*.js` files
- All `manual-*.js` files
- All `check-*.js` files
- All `inspect-*.js` files
- All `verify-*.js` files (except key ones)
- All `test-*.js` files (except main tests)

### Duplicate Zoom Tests (15+ files)
- Multiple zoom sync variations
- Multiple zoom control variations
- Debug zoom implementations

## Next Steps

1. **Convert to TypeScript**: Rename `.js` files to `.ts` with proper types
2. **Add Missing Tests**:
   - Backend unit tests
   - Backend integration tests
   - API endpoint tests
   - More frontend unit tests
3. **Update Imports**: Fix any broken imports in moved files
4. **Update CI/CD**: Update test paths in GitHub Actions