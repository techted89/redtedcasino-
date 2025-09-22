/** @type {import('jest').Config} */
const config = {
  // Indicates that the root of your project is the server directory
  rootDir: '.',
  // The test environment that will be used for testing
  testEnvironment: 'node',
  // Jest will stop running tests after the first failure
  bail: 1,
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    // This is a common setup for ESM path aliases if you use them, not strictly needed now but good practice
  },
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js',
  ],
  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  // This option tells Jest to use Node's `vm` module for running tests, which has better ESM support.
  // It's part of the default for modern Jest, but being explicit can help.
};

export default config;
