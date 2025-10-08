/**
 * Lint-Staged Configuration
 * 
 * Runs automated checks on staged files before commit
 * 
 * Phase 3 - Milestone C.2: Pre-commit hooks integration
 */

module.exports = {
  // TypeScript and JavaScript files
  '**/*.{ts,tsx,js,jsx}': [
    // Run ESLint with custom rules
    'eslint --fix',
    // Run TypeScript type checking
    () => 'tsc --noEmit',
    // Validate error handling patterns
    'node scripts/validate-error-handling.js'
  ],
  
  // API route files - strict validation
  'app/api/**/*.{ts,tsx}': [
    'eslint --fix --max-warnings=0',
    'node scripts/validate-error-handling.js --strict'
  ],
  
  // Format all files
  '**/*': [
    'prettier --write --ignore-unknown'
  ]
};
