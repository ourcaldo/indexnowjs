/**
 * Custom ESLint Rules Plugin
 * 
 * Local ESLint rules for IndexNow Studio project
 * Phase 3 - Milestone C.1: Automated Error Detection
 */

module.exports = {
  rules: {
    'no-console-in-api': require('./no-console-in-api'),
    'no-unsafe-error-handling': require('./no-unsafe-error-handling')
  }
};
