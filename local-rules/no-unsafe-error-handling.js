/**
 * ESLint Rule: no-unsafe-error-handling
 * 
 * Detects unsafe error handling patterns:
 * - Empty catch blocks
 * - Accessing error.message without instanceof check
 * - Empty error messages
 * 
 * Phase 3 - Milestone C.1: Automated Error Detection
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect unsafe error handling patterns',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      emptyCatchBlock: 
        'Empty catch block detected. Either:\n' +
        '  1. Log the error using logger or ErrorHandlingService\n' +
        '  2. Re-throw the error if you cannot handle it\n' +
        '  3. Add a comment explaining why the error is ignored',
      unsafeErrorAccess: 
        'Unsafe access to error.{{property}}. Validate error type first:\n\n' +
        'Example:\n' +
        '  if (error instanceof Error) {\n' +
        '    logger.error({ message: error.message })\n' +
        '  }',
      emptyErrorMessage:
        'Empty error message detected. Provide descriptive error messages:\n\n' +
        'Example:\n' +
        '  // ❌ Bad\n' +
        '  throw new Error("")\n\n' +
        '  // ✅ Good\n' +
        '  throw new Error("Failed to fetch user data: user not found")',
    },
    schema: []
  },

  create(context) {
    const sourceCode = context.getSourceCode();

    return {
      // Check for empty catch blocks
      CatchClause(node) {
        const catchBody = node.body;
        
        // Check if catch block is empty or only has whitespace/comments
        if (catchBody.body.length === 0) {
          // Check if there's a comment explaining the empty catch
          const comments = sourceCode.getCommentsBefore(catchBody);
          const hasExplanation = comments.some(comment => 
            comment.value.toLowerCase().includes('ignore') ||
            comment.value.toLowerCase().includes('expected') ||
            comment.value.toLowerCase().includes('intentional')
          );
          
          if (!hasExplanation) {
            context.report({
              node: catchBody,
              messageId: 'emptyCatchBlock'
            });
          }
        }

        // Check for unsafe error property access
        if (node.param && node.param.type === 'Identifier') {
          const errorParamName = node.param.name;
          const catchBodyText = sourceCode.getText(catchBody);
          
          // Check if error.message or error.stack is accessed
          const errorAccessRegex = new RegExp(`\\b${errorParamName}\\.(message|stack)\\b`, 'g');
          const hasErrorAccess = errorAccessRegex.test(catchBodyText);
          
          if (hasErrorAccess) {
            // Check if there's instanceof Error validation
            const hasInstanceOfCheck = catchBodyText.includes(`${errorParamName} instanceof Error`);
            
            if (!hasInstanceOfCheck) {
              // Find the actual MemberExpression nodes
              context.getDeclaredVariables(node).forEach(() => {
                // This will be caught by the MemberExpression visitor below
              });
            }
          }
        }
      },

      // Check for unsafe error.message or error.stack access
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.property.type === 'Identifier' &&
          (node.property.name === 'message' || node.property.name === 'stack')
        ) {
          // Find the enclosing catch clause
          let parent = node.parent;
          let catchClause = null;
          
          while (parent) {
            if (parent.type === 'CatchClause') {
              catchClause = parent;
              break;
            }
            parent = parent.parent;
          }
          
          // If we're in a catch clause and accessing error properties
          if (catchClause && catchClause.param && catchClause.param.name === node.object.name) {
            const catchBodyText = sourceCode.getText(catchClause.body);
            const hasInstanceOfCheck = catchBodyText.includes(`${node.object.name} instanceof Error`);
            
            if (!hasInstanceOfCheck) {
              context.report({
                node,
                messageId: 'unsafeErrorAccess',
                data: { property: node.property.name }
              });
            }
          }
        }
      },

      // Check for empty error messages in throw statements
      ThrowStatement(node) {
        if (
          node.argument &&
          node.argument.type === 'NewExpression' &&
          node.argument.callee.name === 'Error' &&
          node.argument.arguments.length > 0
        ) {
          const firstArg = node.argument.arguments[0];
          
          // Check if the argument is an empty string
          if (
            firstArg.type === 'Literal' &&
            typeof firstArg.value === 'string' &&
            firstArg.value.trim() === ''
          ) {
            context.report({
              node: firstArg,
              messageId: 'emptyErrorMessage'
            });
          }

          // Check if it's a template literal with no content
          if (
            firstArg.type === 'TemplateLiteral' &&
            firstArg.quasis.length === 1 &&
            firstArg.quasis[0].value.raw.trim() === ''
          ) {
            context.report({
              node: firstArg,
              messageId: 'emptyErrorMessage'
            });
          }
        }

        // Check for throw new Error() with no arguments
        if (
          node.argument &&
          node.argument.type === 'NewExpression' &&
          node.argument.callee.name === 'Error' &&
          node.argument.arguments.length === 0
        ) {
          context.report({
            node: node.argument,
            messageId: 'emptyErrorMessage'
          });
        }
      }
    };
  }
};
