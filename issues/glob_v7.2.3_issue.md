# Glob v7.2.3 Issue

## Summary
glob v7.2.3 is a dependency of the latest version of jest; we can ignore this unsupported warning.

## Details
- Current Jest version: 30.0.3 (latest)
- The warning "glob@7.2.3: Glob versions prior to v9 are no longer supported" appears during npm install
- This is a transitive dependency from `test-exclude` package used by Jest
- Multiple glob versions coexist in the project:
  - glob@7.2.3 (from test-exclude → jest)
  - glob@9.3.5 (from Sentry webpack plugin)
  - glob@10.4.5 (from Jest core and Tailwind)

## Resolution
This warning can be safely ignored as:
1. We're using the latest Jest version
2. The old glob version is only used by Jest's internal dependencies
3. No security vulnerabilities reported
4. The warning is cosmetic and doesn't affect functionality