module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>", "<rootDir>/../tests"],
  testMatch: [
    "**/tests/unit/frontend/**/*.test.ts",
    "**/tests/unit/frontend/**/*.test.js",
    "../tests/unit/frontend/**/*.test.ts",
    "../tests/unit/frontend/**/*.test.js",
  ],
  testTimeout: 30000,
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
  coverageReporters: ["text", "lcov", "html"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
