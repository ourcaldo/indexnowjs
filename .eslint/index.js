/**
 * ESLint Local Rules Plugin
 * 
 * Registers custom ESLint rules for Phase 3 error handling enforcement
 * 
 * Phase 3 - Milestone C.1: Automated Error Detection
 */

const noConsoleInApi = require('./rules/no-console-in-api');
const noUnsafeErrorHandling = require('./rules/no-unsafe-error-handling');

module.exports = {
  rules: {
    'no-console-in-api': noConsoleInApi,
    'no-unsafe-error-handling': noUnsafeErrorHandling
  }
};
