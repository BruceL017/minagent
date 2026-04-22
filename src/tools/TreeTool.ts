import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { z } from 'zod';
import type { Tool } from './types.js';

export const TreeToolSchema = z.object({
  path: z.string().describe('Directory path to show tree for'),
  depth: z.number().optional().describe('Max recursion depth (default: 3)'),
});

const IGNORE_PATTERNS = [
  /^\./,
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '.next',
  '.turbo',
  'target', // Rust
  '__pycache__',
  '.venv',
  'vendor', // Go
];

function shouldIgnore(name: string): boolean {
  for (const pattern of IGNORE_PATTERNS) {
    if (typeof pattern === 'string') {
      if (name === pattern) return true;
    } else if (pattern.test(name)) {
      return true;
    }
  }
  return false;
}

function tree(dir: string, prefix: string, depth: number, maxDepth: number, rootDir: string): string[] {
  if (depth > maxDepth) return [];

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  entries = entries.filter((name) => !shouldIgnore(name)).sort((a, b) => {
    const aDir = isDir(join(dir, a));
    const bDir = isDir(join(dir, b));
    if (aDir && !bDir) return -1;
    if (!aDir && bDir) return 1;
    return a.localeCompare(b);
  });

  const lines: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const name = entries[i]!;
    const isLast = i === entries.length - 1;
    const fullPath = join(dir, name);
    const relPath = relative(rootDir, fullPath) || name;
    const connector = isLast ? '└── ' : '├── ';

    if (isDir(fullPath)) {
      lines.push(`${prefix}${connector}${name}/`);
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      const children = tree(fullPath, childPrefix, depth + 1, maxDepth, rootDir);
      lines.push(...children);
    } else {
      lines.push(`${prefix}${connector}${name}`);
    }
  }

  return lines;
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export const TreeTool: Tool<typeof TreeToolSchema> = {
  name: 'TreeTool',
  description: 'Show a recursive directory tree structure, similar to the `tree` command. Automatically ignores common build/output directories.',
  schema: TreeToolSchema,
  async execute(args) {
    try {
      const resolved = join(process.cwd(), args.path);
      const maxDepth = args.depth ?? 3;

      if (!isDir(resolved)) {
        return `Error: ${args.path} is not a directory`;
      }

      const name = relative(process.cwd(), resolved) || '.';
      const lines = [`${name}/`, ...tree(resolved, '', 1, maxDepth, resolved)];
      return lines.join('\n');
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
};
