/**
 * Jest Configuration
 * Configuration for Jest testing framework
 */

module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!tests/**',
  ],
  testMatch: [
    '**/tests/**/*.test.js',
  ],
  setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 10000,
};
