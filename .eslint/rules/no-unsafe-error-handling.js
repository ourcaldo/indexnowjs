/**
 * ESLint Custom Rule: no-unsafe-error-handling
 * 
 * Detects unsafe error handling patterns:
 * - Empty catch blocks
 * - Catch blocks without logging
 * - Missing error type checks
 * 
 * Phase 3 - Milestone C.1: Automated Error Detection
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce proper error handling with logging and type checking',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      emptyCatch: 'Empty catch block detected. All errors must be logged or re-thrown.',
      missingLogging: 'Catch block should log the error using structured logger (logger.error or ErrorHandlingService).',
      unsafeErrorMessage: 'Direct error.message usage detected. Validate error type first using: if (error instanceof Error)',
      catchAllWithoutType: 'Generic catch-all (catch(e)) should check error type before accessing properties.'
    },
    schema: []
  },

  create(context) {
    const sourceCode = context.getSourceCode();

    /**
     * Check if a catch block contains logging statements
     */
    function hasLogging(catchBlock) {
      if (!catchBlock || !catchBlock.body) return false;
      
      const code = sourceCode.getText(catchBlock.body);
      
      // Check for common logging patterns
      return (
        code.includes('logger.error') ||
        code.includes('logger.warn') ||
        code.includes('ErrorHandlingService') ||
        code.includes('logError') ||
        code.includes('console.error') ||
        code.includes('throw ') // Re-throwing is acceptable
      );
    }

    /**
     * Check if catch block has error type validation
     */
    function hasErrorTypeCheck(catchBlock) {
      if (!catchBlock || !catchBlock.body) return false;
      
      const code = sourceCode.getText(catchBlock.body);
      
      return (
        code.includes('instanceof Error') ||
        code.includes('isError(') ||
        code.includes('throw ') // Re-throwing is acceptable
      );
    }

    /**
     * Check if catch block directly accesses error.message without validation
     */
    function hasUnsafeErrorAccess(catchBlock, paramName) {
      if (!catchBlock || !catchBlock.body || !paramName) return false;
      
      let unsafeAccess = false;
      
      // Check for pattern: error.message, error.stack, etc. without instanceof check
      const checkNode = (node) => {
        if (
          node.type === 'MemberExpression' &&
          node.object.name === paramName &&
          ['message', 'stack', 'name'].includes(node.property?.name)
        ) {
          unsafeAccess = true;
        }
        
        // Recursively check child nodes
        for (const key in node) {
          if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
              node[key].forEach(checkNode);
            } else {
              checkNode(node[key]);
            }
          }
        }
      };
      
      checkNode(catchBlock.body);
      return unsafeAccess;
    }

    return {
      CatchClause(node) {
        const catchBlock = node;
        const errorParam = node.param?.name || 'error';
        
        // Check for empty catch block
        if (!catchBlock.body || catchBlock.body.body.length === 0) {
          context.report({
            node: catchBlock,
            messageId: 'emptyCatch'
          });
          return;
        }

        // Check for missing logging
        if (!hasLogging(catchBlock)) {
          context.report({
            node: catchBlock,
            messageId: 'missingLogging'
          });
        }

        // Check for unsafe error property access
        if (hasUnsafeErrorAccess(catchBlock, errorParam)) {
          if (!hasErrorTypeCheck(catchBlock)) {
            context.report({
              node: catchBlock,
              messageId: 'unsafeErrorMessage'
            });
          }
        }

        // Check for generic catch-all without type checking
        if (errorParam !== 'error' && errorParam !== '_' && !hasErrorTypeCheck(catchBlock)) {
          const code = sourceCode.getText(catchBlock.body);
          if (code.includes(`${errorParam}.`)) {
            context.report({
              node: catchBlock,
              messageId: 'catchAllWithoutType'
            });
          }
        }
      }
    };
  }
};
