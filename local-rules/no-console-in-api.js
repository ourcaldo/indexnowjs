/**
 * ESLint Rule: no-console-in-api
 * 
 * Prevents console.* usage in API routes and enforces structured logging
 * 
 * Phase 3 - Milestone C.1: Automated Error Detection
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow console.* in API routes, enforce structured logging',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      noConsoleInApiRoutes: 
        'console.{{method}}() is not allowed in API routes. Use logger.{{method}}() or ErrorHandlingService instead.\n\n' +
        'Example:\n' +
        '  // ❌ Bad\n' +
        '  console.error("Error:", error)\n\n' +
        '  // ✅ Good\n' +
        '  logger.error({ error, userId, endpoint }, "Error occurred")\n\n' +
        '  // ✅ Also good\n' +
        '  await ErrorHandlingService.createError(ErrorType.SYSTEM, error, { severity: ErrorSeverity.HIGH })',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          allowedMethods: {
            type: 'array',
            items: { type: 'string' },
            description: 'Console methods that are allowed (e.g., time, timeEnd for performance)'
          },
          strictMode: {
            type: 'boolean',
            description: 'If true, enforce in all files. If false, only enforce in API routes'
          }
        },
        additionalProperties: false
      }
    ]
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedMethods = options.allowedMethods || [];
    const strictMode = options.strictMode || false;
    
    const filename = context.getFilename();
    
    // Check if file is an API route or middleware
    const isApiRoute = filename.includes('/api/') || filename.includes('\\api\\');
    const isMiddleware = filename.includes('middleware.ts') || filename.includes('middleware.js');
    
    // Skip if not in strict mode and not an API route
    if (!strictMode && !isApiRoute) {
      return {};
    }

    // Allow console in middleware files (they run before logging infrastructure)
    if (isMiddleware) {
      return {};
    }

    return {
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'console' &&
          node.property.type === 'Identifier'
        ) {
          const method = node.property.name;
          
          // Skip if method is in allowed list
          if (allowedMethods.includes(method)) {
            return;
          }
          
          context.report({
            node,
            messageId: 'noConsoleInApiRoutes',
            data: { method },
            fix(fixer) {
              // Auto-fix: Replace console with logger
              return fixer.replaceText(node.object, 'logger');
            }
          });
        }
      }
    };
  }
};
