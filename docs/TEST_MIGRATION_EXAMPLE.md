# Test Migration Example

This document shows how to migrate existing tests to the new structure.

## Example Migration Commands

```bash
# Create new test structure
cd /home/dwdra/workspace/hatzegopteryx/fullstack-app
mkdir -p tests/e2e/{auth,api,user-journeys,smoke}
mkdir -p tests/integration/{backend,frontend}
mkdir -p tests/unit/{backend,frontend}
mkdir -p tests/visual/screenshots
mkdir -p tests/performance
mkdir -p tests/{helpers,fixtures,factories}

# Migrate E2E tests from /e2e/ directory
mv e2e/security-*.spec.ts tests/e2e/auth/
mv e2e/comprehensive-e2e-test.js tests/e2e/smoke/full-app.e2e.js
mv e2e/admin-functionality-test.js tests/e2e/user-journeys/admin-workflow.e2e.js

# Migrate Playwright tests
mv tests/playwright/security/* tests/e2e/auth/
mv tests/playwright/spc-dashboard/zoom-*.js tests/integration/frontend/
mv tests/playwright/spc-dashboard/*.e2e.js tests/e2e/user-journeys/spc-dashboard/

# Migrate unit tests
mv tests/unit.test.ts tests/unit/frontend/app.test.ts
mv backend/test_security_api.py tests/unit/backend/security-api.test.py
```

## Updated File Paths

### Before:
```
/e2e/security-auth.spec.ts
/tests/playwright/security/test_login_flow.js
/tests/playwright/spc-dashboard/zoom-sync-test.js
/tests/unit.test.ts
```

### After:
```
/tests/e2e/auth/security-auth.e2e.ts
/tests/e2e/auth/login-flow.e2e.ts
/tests/integration/frontend/zoom-sync.integration.test.ts
/tests/unit/frontend/app.test.ts
```

## Update Import Paths

When migrating tests, update any relative imports:

```typescript
// Before
import { loginHelper } from '../../helpers/auth';

// After
import { loginHelper } from '@/tests/helpers/auth';
```

## Update Test Scripts

In `package.json`:
```json
{
  "scripts": {
    "test:e2e": "playwright test tests/e2e",
    "test:e2e:auth": "playwright test tests/e2e/auth",
    "test:e2e:smoke": "playwright test tests/e2e/smoke",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration"
  }
}
```

## Update CI/CD

In `.github/workflows/ci-cd.yml`:
```yaml
- name: Run E2E smoke tests
  run: npm run test:e2e:smoke
  
- name: Run auth tests
  run: npm run test:e2e:auth
```