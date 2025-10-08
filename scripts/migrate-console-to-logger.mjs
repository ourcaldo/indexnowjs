#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGGER_IMPORT = "import { logger } from '@/lib/monitoring/error-handling'";

function getAllTsFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractContext(filePath, methodName) {
  // Extract endpoint from file path
  const relativePath = filePath.replace(/.*\/app\/api/, '/api').replace('/route.ts', '').replace('/\[([^\]]+)\]', '/:$1');
  
  // Common context based on method
  const context = {
    endpoint: `'${relativePath}'`,
    method: methodName || 'GET'
  };
  
  return context;
}

function replaceConsoleLogging(content, filePath) {
  let modified = content;
  let hasChanges = false;
  
  // Check if logger is already imported
  const hasLoggerImport = modified.includes(LOGGER_IMPORT);
  
  // Track if we found any console.* calls
  const consoleCallsFound = /console\.(log|error|warn|info|debug)/.test(modified);
  
  if (!consoleCallsFound) {
    return { content: modified, changed: false };
  }
  
  // Find the HTTP method handler function names
  const methodMatches = [...modified.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/g)];
  
  // Replace console.error
  modified = modified.replace(
    /console\.error\((.*?)\)/gs,
    (match, args) => {
      hasChanges = true;
      
      // Parse arguments
      const argParts = args.split(',').map(a => a.trim());
      
      if (argParts.length === 1) {
        // Simple error: console.error(error)
        return `logger.error({ error: ${argParts[0]} instanceof Error ? ${argParts[0]}.message : String(${argParts[0]}) }, 'Error occurred')`;
      } else if (argParts.length === 2) {
        // Message + data: console.error('message', data)
        const message = argParts[0].replace(/['"]/g, '');
        return `logger.error({ error: ${argParts[1]} instanceof Error ? ${argParts[1]}.message : String(${argParts[1]}) }, '${message}')`;
      } else {
        // Complex: console.error('msg', data1, data2)
        const message = argParts[0].replace(/['"]/g, '');
        const dataArgs = argParts.slice(1).join(', ');
        return `logger.error({ data: [${dataArgs}] }, '${message}')`;
      }
    }
  );
  
  // Replace console.warn
  modified = modified.replace(
    /console\.warn\((.*?)\)/gs,
    (match, args) => {
      hasChanges = true;
      const argParts = args.split(',').map(a => a.trim());
      
      if (argParts.length === 1) {
        return `logger.warn({ message: ${argParts[0]} }, 'Warning')`;
      } else {
        const message = argParts[0].replace(/['"]/g, '');
        const dataArgs = argParts.slice(1).join(', ');
        return `logger.warn({ data: [${dataArgs}] }, '${message}')`;
      }
    }
  );
  
  // Replace console.log and console.info
  modified = modified.replace(
    /console\.(log|info)\((.*?)\)/gs,
    (match, level, args) => {
      hasChanges = true;
      const argParts = args.split(',').map(a => a.trim());
      
      if (argParts.length === 1) {
        return `logger.info({ message: ${argParts[0]} }, 'Info')`;
      } else {
        const message = argParts[0].replace(/['"]/g, '');
        const dataArgs = argParts.slice(1).join(', ');
        return `logger.info({ data: [${dataArgs}] }, '${message}')`;
      }
    }
  );
  
  // Replace console.debug
  modified = modified.replace(
    /console\.debug\((.*?)\)/gs,
    (match, args) => {
      hasChanges = true;
      const argParts = args.split(',').map(a => a.trim());
      
      if (argParts.length === 1) {
        return `logger.debug({ message: ${argParts[0]} }, 'Debug')`;
      } else {
        const message = argParts[0].replace(/['"]/g, '');
        const dataArgs = argParts.slice(1).join(', ');
        return `logger.debug({ data: [${dataArgs}] }, '${message}')`;
      }
    }
  );
  
  // Add logger import if needed and changes were made
  if (hasChanges && !hasLoggerImport) {
    // Find the last import statement
    const importMatches = modified.match(/^import\s+.*?from\s+['"].*?['"]/gm);
    if (importMatches && importMatches.length > 0) {
      const lastImport = importMatches[importMatches.length - 1];
      modified = modified.replace(lastImport, `${lastImport}\n${LOGGER_IMPORT}`);
    } else {
      // No imports found, add at the top
      modified = `${LOGGER_IMPORT}\n\n${modified}`;
    }
  }
  
  return { content: modified, changed: hasChanges };
}

function main() {
  const apiDir = path.join(__dirname, '..', 'app', 'api');
  
  if (!fs.existsSync(apiDir)) {
    console.error('API directory not found:', apiDir);
    process.exit(1);
  }
  
  const tsFiles = getAllTsFiles(apiDir);
  console.log(`Found ${tsFiles.length} TypeScript files in app/api`);
  
  let modifiedCount = 0;
  let totalReplacements = 0;
  
  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const consoleCalls = (content.match(/console\.(log|error|warn|info|debug)/g) || []).length;
    
    if (consoleCalls === 0) {
      continue;
    }
    
    const { content: newContent, changed } = replaceConsoleLogging(content, file);
    
    if (changed) {
      fs.writeFileSync(file, newContent, 'utf-8');
      modifiedCount++;
      totalReplacements += consoleCalls;
      console.log(`✅ Modified: ${file.replace(/.*\/app\/api/, 'app/api')} (${consoleCalls} replacements)`);
    }
  }
  
  console.log(`\n✨ Migration complete!`);
  console.log(`📝 Modified ${modifiedCount} files`);
  console.log(`🔄 Replaced ~${totalReplacements} console.* calls`);
  console.log(`\n⚠️  Manual review recommended for:`);
  console.log(`   - Auth flows (app/api/v1/auth/*)`);
  console.log(`   - Payment webhooks (app/api/*/webhook/*)`);
  console.log(`   - Complex error handling`);
}

main();
