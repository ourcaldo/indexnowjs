#!/usr/bin/env node

/**
 * Error Handling Validation Script
 * 
 * Validates error handling patterns across the codebase:
 * - Ensures all API routes use ErrorHandlingService
 * - Validates proper error logging
 * - Checks for unsafe error handling patterns
 * 
 * Phase 3 - Milestone C.3: Error handling validation script
 * 
 * Usage:
 *   node scripts/validate-error-handling.js [--strict] [files...]
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Parse command line arguments
const args = process.argv.slice(2);
const strictMode = args.includes('--strict');
const targetFiles = args.filter(arg => !arg.startsWith('--'));

// Validation patterns
const PATTERNS = {
  // Required patterns for API routes
  errorHandlingService: /ErrorHandlingService|createError|logError/,
  structuredLogger: /logger\.(error|warn|info|debug)/,
  
  // Anti-patterns to detect
  rawConsole: /console\.(log|error|warn|info)/,
  emptyThrowStatements: /throw\s+new\s+Error\(\s*["'`]\s*["'`]\s*\)/,
  emptyErrorMessage: /throw\s+new\s+Error\(\s*\)/,
  unsafeErrorAccess: /catch\s*\(\s*(\w+)\s*\)\s*{[^}]*\1\.(message|stack)/,
  missingCatchLogging: /catch\s*\([^)]+\)\s*{\s*}/,
  
  // Security patterns
  exposedSecrets: /(api_key|apikey|secret|password|token)\s*[:=]\s*["'][^"']+["']/i,
  sqlInjection: /\$\{[^}]*\}\s*\+\s*["']|["']\s*\+\s*\$\{[^}]*\}/,
};

// Validation results
const results = {
  totalFiles: 0,
  validFiles: 0,
  errors: [],
  warnings: []
};

/**
 * Validate a single file
 */
function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const isApiRoute = filePath.includes('/api/') || filePath.includes('\\api\\');
  
  const fileErrors = [];
  const fileWarnings = [];

  // Check for console.* usage in API routes
  if (isApiRoute && PATTERNS.rawConsole.test(content)) {
    const matches = content.matchAll(/console\.(log|error|warn|info)/g);
    for (const match of matches) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      fileErrors.push({
        file: filePath,
        line: lineNumber,
        message: `console.${match[1]} detected in API route. Use structured logger instead.`,
        severity: 'error'
      });
    }
  }

  // Check for ErrorHandlingService usage in API routes
  if (isApiRoute && content.includes('catch (')) {
    if (!PATTERNS.errorHandlingService.test(content) && !PATTERNS.structuredLogger.test(content)) {
      fileWarnings.push({
        file: filePath,
        line: 0,
        message: 'API route with try-catch should use ErrorHandlingService or structured logger',
        severity: 'warning'
      });
    }
  }

  // Check for empty error messages
  if (PATTERNS.emptyErrorMessage.test(content) || PATTERNS.emptyThrowStatements.test(content)) {
    const matches = content.matchAll(/(throw\s+new\s+Error\(\s*["'`]\s*["'`]\s*\)|throw\s+new\s+Error\(\s*\))/g);
    for (const match of matches) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      fileErrors.push({
        file: filePath,
        line: lineNumber,
        message: 'Empty error message detected. Provide descriptive error messages.',
        severity: 'error'
      });
    }
  }

  // Check for unsafe error property access
  if (PATTERNS.unsafeErrorAccess.test(content)) {
    const matches = content.matchAll(/catch\s*\(\s*(\w+)\s*\)\s*{[^}]*(\1)\.(message|stack)/g);
    for (const match of matches) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const varName = match[1];
      const property = match[3];
      
      // Check if there's instanceof validation
      const catchBlock = match[0];
      if (!catchBlock.includes('instanceof Error')) {
        fileWarnings.push({
          file: filePath,
          line: lineNumber,
          message: `Unsafe ${varName}.${property} access. Validate error type with 'instanceof Error' first.`,
          severity: 'warning'
        });
      }
    }
  }

  // Check for exposed secrets (security)
  if (PATTERNS.exposedSecrets.test(content)) {
    const matches = content.matchAll(PATTERNS.exposedSecrets);
    for (const match of matches) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      fileErrors.push({
        file: filePath,
        line: lineNumber,
        message: 'Potential secret exposure detected. Use environment variables.',
        severity: 'error'
      });
    }
  }

  return { fileErrors, fileWarnings };
}

/**
 * Main validation function
 */
async function validateErrorHandling() {
  console.log('🔍 Validating error handling patterns...\n');
  
  // Determine files to validate
  let filesToValidate = [];
  
  if (targetFiles.length > 0) {
    // Validate specific files
    filesToValidate = targetFiles.filter(f => 
      f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')
    );
  } else {
    // Validate all API routes and lib files
    const apiFiles = await glob('app/api/**/*.{ts,tsx}', { ignore: 'node_modules/**' });
    const libFiles = await glob('lib/**/*.{ts,tsx}', { ignore: 'node_modules/**' });
    filesToValidate = [...apiFiles, ...libFiles];
  }

  results.totalFiles = filesToValidate.length;

  // Validate each file
  for (const file of filesToValidate) {
    try {
      const { fileErrors, fileWarnings } = validateFile(file);
      
      if (fileErrors.length === 0 && (strictMode ? fileWarnings.length === 0 : true)) {
        results.validFiles++;
      }
      
      results.errors.push(...fileErrors);
      results.warnings.push(...fileWarnings);
    } catch (error) {
      console.error(`Error validating ${file}:`, error.message);
    }
  }

  // Print results
  console.log(`\n📊 Validation Results:`);
  console.log(`   Total files: ${results.totalFiles}`);
  console.log(`   Valid files: ${results.validFiles}`);
  console.log(`   Errors: ${results.errors.length}`);
  console.log(`   Warnings: ${results.warnings.length}\n`);

  // Print errors
  if (results.errors.length > 0) {
    console.log('❌ Errors:\n');
    results.errors.forEach(err => {
      console.log(`   ${err.file}:${err.line}`);
      console.log(`   ↳ ${err.message}\n`);
    });
  }

  // Print warnings
  if (results.warnings.length > 0 && (strictMode || results.errors.length === 0)) {
    console.log('⚠️  Warnings:\n');
    results.warnings.forEach(warn => {
      console.log(`   ${warn.file}:${warn.line}`);
      console.log(`   ↳ ${warn.message}\n`);
    });
  }

  // Exit with error if validation failed
  if (results.errors.length > 0 || (strictMode && results.warnings.length > 0)) {
    console.log('❌ Validation failed!');
    process.exit(1);
  } else {
    console.log('✅ Validation passed!');
    process.exit(0);
  }
}

// Run validation
validateErrorHandling().catch(error => {
  console.error('Fatal error during validation:', error);
  process.exit(1);
});
