/*
  Repo Docs Generator
  - Scans Next.js app/api routes, lib exported functions/classes, and React components
  - Outputs Markdown under docs/
*/

import fs from 'fs';
import path from 'path';

const WORKSPACE_ROOT = process.cwd();

// ---------- FS utils ----------
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function walkDir(dir: string, filterExt: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.next') || entry.name === 'docs' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, filterExt));
    } else {
      const ext = path.extname(entry.name);
      if (filterExt.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function readFileSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

// ---------- API Routes ----------

type ApiRoute = {
  file: string;
  urlPath: string;
  methods: string[];
  auth: 'public' | 'authenticated' | 'admin' | 'system' | 'unknown';
  description?: string;
};

function toApiUrlFromFile(routeFile: string): string {
  // Expect pattern: /app/api/**/route.ts
  const idx = routeFile.indexOf(`${path.sep}app${path.sep}api${path.sep}`);
  if (idx === -1) return '';
  let sub = routeFile.slice(idx + (`${path.sep}app${path.sep}api${path.sep}`).length);
  // remove trailing /route.ts
  sub = sub.replace(/\/?route\.(t|j)sx?$/i, '');
  // convert dynamic segments [id] -> :id, [[...slug]] -> :slug, [...slug] -> :slug
  sub = sub.replace(/\[\[?\.\.\.(.+?)\]\]/g, ':$1');
  sub = sub.replace(/\[(.+?)\]/g, ':$1');
  if (!sub.startsWith('/')) sub = '/' + sub;
  return '/api' + sub;
}

function detectAuthKind(source: string): ApiRoute['auth'] {
  if (/\badminApiWrapper\s*\(/.test(source)) return 'admin';
  if (/\bauthenticatedApiWrapper\s*\(/.test(source)) return 'authenticated';
  if (/\bwithSystemAuth\s*\(/.test(source)) return 'system';
  if (/\bpublicApiWrapper\s*\(/.test(source)) return 'public';
  return 'unknown';
}

function extractJsDocDescription(source: string): string | undefined {
  // Grab the first block JSDoc before an export const METHOD or default function
  const methodIdx = source.search(/export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*=|export\s+default\s+async?\s*function|export\s+async?\s*function/);
  if (methodIdx === -1) return undefined;
  const before = source.slice(0, methodIdx);
  const m = before.match(/\/\*\*[\s\S]*?\*\//g);
  if (!m || m.length === 0) return undefined;
  const last = m[m.length - 1];
  // Clean JSDoc markers
  return last
    .replace(/\/\*\*/g, '')
    .replace(/\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .join(' ')
    .trim();
}

function findApiRoutes(): ApiRoute[] {
  const apiRoot = path.join(WORKSPACE_ROOT, 'app', 'api');
  if (!fs.existsSync(apiRoot)) return [];
  const files = walkDir(apiRoot).filter((f) => /\broute\.(t|j)sx?$/i.test(f));
  const routes: ApiRoute[] = [];
  for (const file of files) {
    const source = readFileSafe(file);
    const methods = Array.from(source.matchAll(/export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*=/g)).map((m) => m[1]);
    const urlPath = toApiUrlFromFile(file);
    const auth = detectAuthKind(source);
    const description = extractJsDocDescription(source);
    routes.push({ file, urlPath, methods: methods.length ? Array.from(new Set(methods)) : [], auth, description });
  }
  // Sort by path
  routes.sort((a, b) => a.urlPath.localeCompare(b.urlPath));
  return routes;
}

function renderCurlExample(method: string, urlPath: string, auth: ApiRoute['auth']): string {
  const base = '${BASE_URL}'; // placeholder
  const fullUrl = `${base}${urlPath}`;
  const authHeader = auth === 'admin' || auth === 'authenticated' ? " \\\n  -H 'Authorization: Bearer ${TOKEN}'" : '';
  const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
    ? " \\\n  -H 'Content-Type: application/json' \\\n  -d '{\\\"example\\\":\\\"value\\\"}'"
    : '';
  return `curl -X ${method.toUpperCase()} \\\n  '${fullUrl}'${authHeader}${body}`;
}

function generateApiDocs(routes: ApiRoute[]): string {
  const groups = new Map<string, ApiRoute[]>();
  for (const r of routes) {
    const segs = r.urlPath.split('/').filter(Boolean);
    const group = segs.length >= 3 ? segs[2] : 'misc'; // /api/v1/<group>/...
    const key = segs[1] === 'v1' ? `v1/${group}` : segs[1] || 'misc';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const lines: string[] = [];
  lines.push('# API Reference');
  lines.push('');
  lines.push('This document lists all HTTP API endpoints automatically extracted from the codebase. Replace BASE_URL with your deployment domain.');
  lines.push('');

  const sortedKeys = Array.from(groups.keys()).sort();
  for (const key of sortedKeys) {
    lines.push(`## ${key}`);
    lines.push('');
    const list = groups.get(key)!;
    for (const r of list) {
      const methodList = r.methods.length ? r.methods.join(', ') : '—';
      lines.push(`### ${r.urlPath}`);
      lines.push('');
      lines.push(`- **methods**: ${methodList}`);
      lines.push(`- **auth**: ${r.auth}`);
      if (r.description) lines.push(`- **description**: ${r.description}`);
      lines.push('');
      for (const m of r.methods) {
        lines.push('```bash');
        lines.push(renderCurlExample(m, r.urlPath, r.auth));
        lines.push('```');
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

// ---------- lib exports ----------

type ExportedItem = {
  kind: 'function' | 'const' | 'class' | 'type' | 'interface';
  name: string;
  signature: string;
  file: string;
};

function extractExportsFromSource(file: string, source: string): ExportedItem[] {
  const items: ExportedItem[] = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // function declarations
    let m = line.match(/^\s*export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\((.*)$/);
    if (m) {
      const sig = collectSignature(lines, i);
      items.push({ kind: 'function', name: m[1], signature: sig, file });
      continue;
    }
    // const function exports: export const name = (args) =>
    m = line.match(/^\s*export\s+const\s+([A-Za-z0-9_]+)\s*=\s*\(/);
    if (m) {
      const sig = collectSignature(lines, i).replace(/^\s*export\s+const\s+/, '');
      items.push({ kind: 'const', name: m[1], signature: sig, file });
      continue;
    }
    // class exports
    m = line.match(/^\s*export\s+class\s+([A-Za-z0-9_]+)/);
    if (m) {
      const sig = line.trim();
      items.push({ kind: 'class', name: m[1], signature: sig, file });
      continue;
    }
    // interfaces
    m = line.match(/^\s*export\s+interface\s+([A-Za-z0-9_]+)/);
    if (m) {
      const sig = line.trim();
      items.push({ kind: 'interface', name: m[1], signature: sig, file });
      continue;
    }
    // types
    m = line.match(/^\s*export\s+type\s+([A-Za-z0-9_]+)/);
    if (m) {
      const sig = line.trim();
      items.push({ kind: 'type', name: m[1], signature: sig, file });
      continue;
    }
  }
  return items;
}

function collectSignature(lines: string[], startIndex: number): string {
  // Collect lines until we likely reached the end of the signature: a line ending with { or => or ;
  const parts: string[] = [];
  for (let i = startIndex; i < Math.min(lines.length, startIndex + 20); i++) {
    parts.push(lines[i].trim());
    if (/\{\s*$/.test(lines[i]) || /=>\s*\{?\s*$/.test(lines[i]) || /;\s*$/.test(lines[i])) break;
  }
  return parts.join(' ');
}

function findLibExports(): ExportedItem[] {
  const libRoot = path.join(WORKSPACE_ROOT, 'lib');
  if (!fs.existsSync(libRoot)) return [];
  const files = walkDir(libRoot, ['.ts', '.tsx', '.js', '.jsx']).filter((f) => !f.endsWith('.d.ts'));
  const items: ExportedItem[] = [];
  for (const file of files) {
    const src = readFileSafe(file);
    const found = extractExportsFromSource(file, src);
    items.push(...found);
  }
  // Sort by file then name
  items.sort((a, b) => (a.file === b.file ? a.name.localeCompare(b.name) : a.file.localeCompare(b.file)));
  return items;
}

function generateLibDocs(items: ExportedItem[]): string {
  const groups = new Map<string, ExportedItem[]>();
  for (const it of items) {
    const rel = path.relative(WORKSPACE_ROOT, it.file);
    const dir = path.dirname(rel);
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(it);
  }
  const dirs = Array.from(groups.keys()).sort();
  const lines: string[] = [];
  lines.push('# Library API');
  lines.push('');
  lines.push('Exported functions, classes, types from `lib/`.');
  lines.push('');
  for (const dir of dirs) {
    lines.push(`## ${dir}`);
    lines.push('');
    const list = groups.get(dir)!.sort((a, b) => a.name.localeCompare(b.name));
    for (const it of list) {
      lines.push(`### ${it.name}`);
      lines.push('');
      lines.push(`- **kind**: ${it.kind}`);
      lines.push('');
      lines.push('```ts');
      lines.push(it.signature);
      lines.push('```');
      lines.push('');
      // usage stub
      if (it.kind === 'function' || it.kind === 'const' || it.kind === 'class') {
        lines.push('```ts');
        lines.push(`import { ${it.name} } from '@/` + path.relative(WORKSPACE_ROOT, it.file).replace(/\\\\/g, '/') + `';`);
        if (it.kind === 'class') {
          lines.push(`const instance = new ${it.name}(/* params */);`);
        } else {
          lines.push(`${it.name}(/* params */);`);
        }
        lines.push('```');
        lines.push('');
      }
    }
  }
  return lines.join('\n');
}

// ---------- React components ----------

type ComponentDoc = {
  exportKind: 'default' | 'named';
  name: string;
  props: string[];
  file: string;
};

function extractComponentDocs(file: string, source: string): ComponentDoc[] {
  const docs: ComponentDoc[] = [];
  const lines = source.split(/\r?\n/);
  const text = source;

  // default export component: export default function Name({ ... }: Type)
  const defMatches = Array.from(text.matchAll(/export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g));
  for (const m of defMatches) {
    const name = m[1];
    const propsRaw = m[2] || '';
    const props = extractDestructuredProps(propsRaw);
    docs.push({ exportKind: 'default', name, props, file });
  }

  // named const component: export const Name = ({ ... }: Type) =>
  const namedMatches = Array.from(text.matchAll(/export\s+const\s+([A-Za-z0-9_]+)\s*=\s*\(\s*\{([^}]*)\}\s*:\s*[^)]*\)\s*=>/g));
  for (const m of namedMatches) {
    const name = m[1];
    const props = (m[2] || '')
      .split(',')
      .map((s) => s.trim().split(':')[0].trim())
      .filter(Boolean);
    docs.push({ exportKind: 'named', name, props, file });
  }

  // fallback: named without explicit type, export const Name = ({ a, b }) =>
  const namedMatches2 = Array.from(text.matchAll(/export\s+const\s+([A-Za-z0-9_]+)\s*=\s*\(\s*\{([^}]*)\}\s*\)\s*=>/g));
  for (const m of namedMatches2) {
    const name = m[1];
    const props = (m[2] || '')
      .split(',')
      .map((s) => s.trim().split(':')[0].trim())
      .filter(Boolean);
    docs.push({ exportKind: 'named', name, props, file });
  }

  return docs;
}

function extractDestructuredProps(paramBlock: string): string[] {
  const m = paramBlock.match(/\{([\s\S]*?)\}/);
  if (!m) return [];
  const inner = m[1] || '';
  return inner
    .split(',')
    .map((s) => s.trim().split(':')[0].split('=')[0].trim())
    .filter(Boolean);
}

function findComponents(): ComponentDoc[] {
  const roots = [path.join(WORKSPACE_ROOT, 'components'), path.join(WORKSPACE_ROOT, 'app')];
  const componentFiles: string[] = [];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    const files = walkDir(r, ['.tsx', '.jsx']);
    componentFiles.push(...files);
  }
  const docs: ComponentDoc[] = [];
  for (const file of componentFiles) {
    const src = readFileSafe(file);
    // Only consider files within a components folder or that look like components by PascalCase default export
    if (!/components\b/.test(file) && !/export\s+default\s+function\s+[A-Z]/.test(src) && !/export\s+const\s+[A-Z]/.test(src)) {
      continue;
    }
    const d = extractComponentDocs(file, src);
    docs.push(...d);
  }
  // Sort by file then name
  docs.sort((a, b) => (a.file === b.file ? a.name.localeCompare(b.name) : a.file.localeCompare(b.file)));
  return docs;
}

function generateComponentDocs(components: ComponentDoc[]): string {
  const groups = new Map<string, ComponentDoc[]>();
  for (const c of components) {
    const rel = path.relative(WORKSPACE_ROOT, c.file);
    const dir = path.dirname(rel);
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(c);
  }
  const dirs = Array.from(groups.keys()).sort();
  const lines: string[] = [];
  lines.push('# UI Components');
  lines.push('');
  lines.push('Public React components discovered in `components/` and `app/**/components/`.');
  lines.push('');
  for (const dir of dirs) {
    lines.push(`## ${dir}`);
    lines.push('');
    const list = groups.get(dir)!.sort((a, b) => a.name.localeCompare(b.name));
    for (const c of list) {
      lines.push(`### ${c.name}`);
      lines.push('');
      lines.push(`- **export**: ${c.exportKind}`);
      if (c.props.length) lines.push(`- **props**: ${c.props.join(', ')}`);
      lines.push('');
      const rel = path.relative(WORKSPACE_ROOT, c.file).replace(/\\\\/g, '/');
      const importPath = `@/${rel.replace(/\.(t|j)sx?$/, '')}`;
      lines.push('```tsx');
      if (c.exportKind === 'default') {
        lines.push(`import ${c.name} from '${importPath}';`);
        } else {
        lines.push(`import { ${c.name} } from '${importPath}';`);
      }
      const propSpread = c.props.length ? c.props.map((p) => `${p}={/* value */}`).join(' ') : '';
      lines.push(`<${c.name} ${propSpread} />`);
      lines.push('```');
      lines.push('');
    }
  }
  return lines.join('\n');
}

// ---------- Orchestrator ----------

function writeDocs(apiMd: string, libMd: string, componentsMd: string) {
  const docsRoot = path.join(WORKSPACE_ROOT, 'docs');
  const apiDir = path.join(docsRoot, 'api');
  const libDir = path.join(docsRoot, 'lib');
  const compDir = path.join(docsRoot, 'components');
  ensureDir(docsRoot);
  ensureDir(apiDir);
  ensureDir(libDir);
  ensureDir(compDir);

  fs.writeFileSync(path.join(docsRoot, 'README.md'), `# Project Documentation\n\n- See ./api/README.md for HTTP API\n- See ./lib/README.md for library APIs\n- See ./components/README.md for UI components\n`);
  fs.writeFileSync(path.join(apiDir, 'README.md'), apiMd);
  fs.writeFileSync(path.join(libDir, 'README.md'), libMd);
  fs.writeFileSync(path.join(compDir, 'README.md'), componentsMd);
}

function main() {
  const routes = findApiRoutes();
  const apiMd = generateApiDocs(routes);

  const libItems = findLibExports();
  const libMd = generateLibDocs(libItems);

  const components = findComponents();
  const compMd = generateComponentDocs(components);

  writeDocs(apiMd, libMd, compMd);

  // Root index with counts
  const summary = [
    `- API endpoints: ${routes.length}`,
    `- Library exports: ${libItems.length}`,
    `- UI components: ${components.length}`,
  ].join('\n');
  const rootIndex = path.join(WORKSPACE_ROOT, 'docs', 'README.md');
  const curr = readFileSafe(rootIndex);
  fs.writeFileSync(rootIndex, curr + '\n' + summary + '\n');

  console.log('Docs generated successfully.');
}

main();
