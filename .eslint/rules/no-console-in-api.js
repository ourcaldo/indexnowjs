/**
 * ESLint Custom Rule: no-console-in-api
 * 
 * Prevents usage of console.log, console.error, console.warn, etc. in API routes
 * Enforces use of structured logger instead
 * 
 * Phase 3 - Milestone C.1: Automated Error Detection
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow console.* usage in API routes, enforce structured logging',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      noConsoleInApi: 'Console.{{method}} is not allowed in API routes. Use logger.{{suggestion}}() instead for structured logging.',
      noConsoleAnywhere: 'Direct console.{{method}} usage detected. Consider using the structured logger for better error tracking.'
    },
    schema: [{
      type: 'object',
      properties: {
        allowedMethods: {
          type: 'array',
          items: { type: 'string' },
          description: 'Console methods that are allowed (e.g., ["time", "timeEnd"])'
        },
        strictMode: {
          type: 'boolean',
          description: 'If true, disallow console in ALL files, not just API routes'
        }
      },
      additionalProperties: false
    }]
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedMethods = options.allowedMethods || [];
    const strictMode = options.strictMode || false;
    const filename = context.getFilename();
    
    // Determine if current file is an API route
    const isApiRoute = 
      filename.includes('/api/') ||
      filename.includes('/app/api/') ||
      filename.includes('\\api\\') ||
      filename.includes('\\app\\api\\');

    // Mapping of console methods to logger equivalents
    const consoleToLoggerMap = {
      log: 'info',
      error: 'error',
      warn: 'warn',
      info: 'info',
      debug: 'debug',
      trace: 'debug'
    };

    return {
      MemberExpression(node) {
        // Check if it's a console.* call
        if (
          node.object.name === 'console' &&
          node.property.type === 'Identifier'
        ) {
          const method = node.property.name;
          
          // Skip if method is in allowed list
          if (allowedMethods.includes(method)) {
            return;
          }

          // In API routes, always report
          if (isApiRoute) {
            const suggestion = consoleToLoggerMap[method] || 'info';
            context.report({
              node,
              messageId: 'noConsoleInApi',
              data: { method, suggestion }
            });
            return;
          }

          // In strict mode, report everywhere
          if (strictMode) {
            const suggestion = consoleToLoggerMap[method] || 'info';
            context.report({
              node,
              messageId: 'noConsoleAnywhere',
              data: { method, suggestion }
            });
          }
        }
      }
    };
  }
};
