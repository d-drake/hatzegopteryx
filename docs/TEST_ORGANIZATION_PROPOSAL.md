# Test Organization Best Practices for Hatzegopteryx

## Overview

This document defines the standardized test organization structure for the Hatzegopteryx project to ensure consistency across all contributors and AI agents.

## Proposed Test Structure

```
hatzegopteryx/
├── fullstack-app/
│   ├── tests/                    # All test files go here
│   │   ├── e2e/                  # End-to-end tests
│   │   │   ├── auth/            # Authentication flow tests
│   │   │   ├── api/             # API integration tests
│   │   │   ├── user-journeys/   # Complete user workflow tests
│   │   │   └── smoke/           # Critical path tests
│   │   ├── integration/          # Integration tests
│   │   │   ├── backend/         # Backend integration tests
│   │   │   └── frontend/        # Frontend integration tests
│   │   ├── unit/                # Unit tests
│   │   │   ├── backend/         # Backend unit tests
│   │   │   └── frontend/        # Frontend unit tests
│   │   ├── visual/              # Visual regression tests
│   │   │   └── screenshots/     # Reference screenshots
│   │   ├── performance/         # Performance tests
│   │   └── helpers/             # Test utilities and helpers
│   │
│   ├── backend/
│   │   └── __tests__/           # Co-located backend tests (optional)
│   │       ├── unit/           # Unit tests next to source
│   │       └── integration/    # Integration tests
│   │
│   └── frontend/
│       └── __tests__/           # Co-located frontend tests (optional)
│           ├── components/      # Component unit tests
│           └── hooks/          # Hook unit tests
```

## Test Categories and Placement

### 1. End-to-End Tests (`/tests/e2e/`)
- **Purpose**: Test complete user workflows across the entire stack
- **Framework**: Playwright
- **File naming**: `*.e2e.ts` or `*.e2e.js`
- **Examples**:
  - `/tests/e2e/auth/login-flow.e2e.ts`
  - `/tests/e2e/user-journeys/spc-dashboard-workflow.e2e.ts`

### 2. Integration Tests (`/tests/integration/`)
- **Purpose**: Test interactions between multiple components/services
- **Framework**: Jest (frontend), Pytest (backend)
- **File naming**: `*.integration.test.ts` or `*.integration.test.py`
- **Examples**:
  - `/tests/integration/backend/auth-api.integration.test.py`
  - `/tests/integration/frontend/chart-data.integration.test.ts`

### 3. Unit Tests (`/tests/unit/` or co-located)
- **Purpose**: Test individual functions, components, or modules
- **Framework**: Jest (frontend), Pytest (backend)
- **File naming**: `*.test.ts`, `*.test.tsx`, or `*.test.py`
- **Placement Options**:
  - Centralized: `/tests/unit/backend/auth.test.py`
  - Co-located: `/backend/auth/__tests__/auth.test.py`

### 4. Visual Regression Tests (`/tests/visual/`)
- **Purpose**: Detect unintended visual changes
- **Framework**: Playwright or Percy
- **File naming**: `*.visual.ts`
- **Examples**:
  - `/tests/visual/spc-dashboard.visual.ts`
  - `/tests/visual/screenshots/baseline/`

### 5. Performance Tests (`/tests/performance/`)
- **Purpose**: Test application performance and load
- **Framework**: k6, Artillery, or custom scripts
- **File naming**: `*.perf.ts` or `*.perf.js`

## Configuration Files

All test configuration files should be at the project root:

```
fullstack-app/
├── playwright.config.ts          # E2E test configuration
├── jest.config.js               # Unit/integration test configuration
├── .prettierrc.test.json        # Test-specific formatting
└── tsconfig.test.json           # Test-specific TypeScript config
```

## Migration Plan

### Phase 1: Consolidate E2E Tests
1. Move all files from `/e2e/` to `/tests/e2e/`
2. Move all files from `/tests/playwright/` to `/tests/e2e/`
3. Organize by feature/domain

### Phase 2: Organize Unit Tests
1. Create `/tests/unit/backend/` and `/tests/unit/frontend/`
2. Move existing unit tests to appropriate directories
3. Establish co-location strategy for new tests

### Phase 3: Update CI/CD
1. Update test paths in GitHub Actions
2. Update npm scripts in package.json
3. Update documentation

## Best Practices

### File Naming Conventions
- E2E tests: `feature-name.e2e.ts`
- Integration tests: `feature-name.integration.test.ts`
- Unit tests: `module-name.test.ts`
- Visual tests: `component-name.visual.ts`
- Performance tests: `scenario-name.perf.ts`

### Test Organization Principles
1. **Group by feature, not by file type**
   - ✅ `/tests/e2e/auth/login.e2e.ts`
   - ❌ `/tests/e2e/pages/login-page.ts`

2. **Keep test files close to what they test**
   - Unit tests can be co-located with source code
   - Integration and E2E tests in centralized `/tests/` directory

3. **Use descriptive directory names**
   - ✅ `/tests/e2e/user-journeys/`
   - ❌ `/tests/e2e/scenarios/`

4. **Separate test utilities**
   - Keep helpers in `/tests/helpers/`
   - Share fixtures in `/tests/fixtures/`

### TypeScript/JavaScript Guidelines
- Prefer TypeScript (`.ts`) for all new tests
- Use `.spec.ts` suffix only for Playwright tests if required
- Regular test files should use `.test.ts` suffix

### Test Data Management
```
tests/
├── fixtures/              # Static test data
│   ├── users.json
│   └── spc-data.json
├── factories/             # Dynamic test data generators
│   ├── user.factory.ts
│   └── measurement.factory.ts
└── seeds/                # Database seed files
    └── test-db.sql
```

## Example Test File Locations

### Current Structure → Proposed Structure

```
# E2E Tests
/e2e/comprehensive-e2e-test.js → /tests/e2e/smoke/full-app.e2e.ts
/tests/playwright/security/test_login_flow.js → /tests/e2e/auth/login-flow.e2e.ts

# Unit Tests
/tests/unit.test.ts → /tests/unit/frontend/app.test.ts
/backend/test_security_api.py → /tests/unit/backend/security-api.test.py

# Integration Tests
/tests/playwright/spc-dashboard/zoom-sync-test.js → /tests/integration/frontend/zoom-sync.integration.test.ts
```

## CI/CD Updates Required

Update test scripts in `package.json`:
```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "playwright test tests/e2e",
    "test:e2e:smoke": "playwright test tests/e2e/smoke",
    "test:visual": "playwright test tests/visual",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

Update GitHub Actions workflow:
```yaml
- name: Run unit tests
  run: npm run test:unit
  
- name: Run E2E tests
  run: npm run test:e2e:smoke
```

## Benefits of This Structure

1. **Consistency**: All developers and AI agents know where to place tests
2. **Scalability**: Easy to add new test categories
3. **Discoverability**: Tests are easy to find by feature
4. **Maintenance**: Clear ownership and organization
5. **CI/CD Integration**: Simple test execution patterns
6. **Flexibility**: Supports both centralized and co-located strategies

## Implementation Timeline

- **Week 1**: Create new directory structure
- **Week 2**: Migrate E2E tests
- **Week 3**: Migrate unit and integration tests
- **Week 4**: Update CI/CD and documentation

---

This structure should be followed by all contributors to maintain consistency across the project.