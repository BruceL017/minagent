import { z } from 'zod';
import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve, relative } from 'path';
import type { Tool } from './types.js';

export const LSPToolSchema = z.object({
  operation: z.enum([
    'goToDefinition',
    'findReferences',
    'hover',
    'documentSymbol',
    'workspaceSymbol',
  ]).describe('LSP operation to perform'),
  filePath: z.string().describe('Path to the file'),
  line: z.number().int().min(1).describe('1-based line number'),
  character: z.number().int().min(1).describe('1-based character offset'),
  query: z.string().optional().describe('Search query for workspaceSymbol'),
});

function resolveFilePath(filePath: string): string {
  return resolve(process.cwd(), filePath);
}

function readFileLines(filePath: string): string[] {
  return readFileSync(filePath, 'utf-8').split('\n');
}

function getSymbolAt(lines: string[], line: number, char: number): string {
  const l = lines[line - 1];
  if (!l) return '';
  // Find word boundaries around the character
  let start = char - 1;
  let end = char - 1;
  const wordChars = /[a-zA-Z0-9_$.]/;
  while (start > 0 && wordChars.test(l.charAt(start - 1))) start--;
  while (end < l.length && wordChars.test(l.charAt(end))) end++;
  return l.slice(start, end);
}

function grepSymbol(symbol: string, filePath: string): string[] {
  const result = spawnSync('grep', [
    '-rn',
    '--include=*.{ts,tsx,js,jsx,py,go,rs,java,c,cpp,h,hpp}',
    '-w',
    symbol,
    '.',
  ], { cwd: process.cwd(), encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0 || !result.stdout) return [];
  return result.stdout.split('\n').filter((l) => l.trim());
}

function formatLocation(file: string, line: number, text: string): string {
  const rel = relative(process.cwd(), file) || file;
  return `${rel}:${line}: ${text.slice(0, 120)}`;
}

export const LSPTool: Tool<typeof LSPToolSchema> = {
  name: 'LSPTool',
  description: 'Code intelligence operations. Use for go-to-definition, find-references, hover info, and symbol search. Works best for TypeScript/JavaScript projects. Falls back to grep-based search for other languages.',
  schema: LSPToolSchema,
  async execute(args) {
    const filePath = resolveFilePath(args.filePath);
    const lines = readFileLines(filePath);
    const symbol = getSymbolAt(lines, args.line, args.character);

    switch (args.operation) {
      case 'goToDefinition': {
        if (!symbol) return 'Could not identify symbol at cursor position.';
        // Try tsc for TypeScript files
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
          const tsc = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
            cwd: process.cwd(), encoding: 'utf-8',
          });
        }
        // Fallback: grep for declarations
        const results = grepSymbol(symbol, filePath);
        const defs = results.filter((r) =>
          /\b(const|let|var|function|class|interface|type|enum|import)\b/.test(r)
        );
        if (defs.length === 0) {
          return `No definition found for "${symbol}".\n\nAll occurrences:\n${results.slice(0, 10).join('\n')}`;
        }
        return `Definitions for "${symbol}":\n${defs.slice(0, 10).join('\n')}`;
      }

      case 'findReferences': {
        if (!symbol) return 'Could not identify symbol at cursor position.';
        const results = grepSymbol(symbol, filePath);
        if (results.length === 0) return `No references found for "${symbol}".`;
        return `Found ${results.length} references to "${symbol}":\n${results.slice(0, 15).join('\n')}`;
      }

      case 'hover': {
        if (!symbol) return 'Could not identify symbol at cursor position.';
        // For TypeScript, try to find type annotations or JSDoc
        const lineText = lines[args.line - 1] || '';
        // Check previous lines for JSDoc
        let jsdoc = '';
        for (let i = args.line - 2; i >= Math.max(0, args.line - 10); i--) {
          const l = lines[i];
          if (!l) break;
          if (l.trim().startsWith('/**')) {
            jsdoc = lines.slice(i, args.line - 1).join('\n');
            break;
          }
          if (!l.trim().startsWith('*') && !l.trim().startsWith('/*')) break;
        }
        const info = [
          `Symbol: ${symbol}`,
          `Line ${args.line}: ${lineText.trim()}`,
        ];
        if (jsdoc) info.push(`JSDoc:\n${jsdoc}`);
        // Try to infer type from context
        if (lineText.includes(': ')) {
          const typeMatch = lineText.match(new RegExp(`${symbol}\\s*:\\s*([^;,{]+)`));
          if (typeMatch?.[1]) info.push(`Type: ${typeMatch[1].trim()}`);
        }
        return info.join('\n\n');
      }

      case 'documentSymbol': {
        const symbols: string[] = [];
        const patterns = [
          { regex: /^\s*(export\s+)?(class|interface|type|enum)\s+(\w+)/, name: 3 },
          { regex: /^\s*(export\s+)?(function|const|let|var)\s+(\w+)/, name: 3 },
          { regex: /^\s*(\w+)\s*\([^)]*\)\s*\{/, name: 1 },
        ];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          for (const p of patterns) {
            const match = line.match(p.regex);
            if (match && match[p.name]) {
              symbols.push(`${match[p.name]} (line ${i + 1})`);
              break;
            }
          }
        }
        if (symbols.length === 0) return `No symbols found in ${args.filePath}`;
        return `Symbols in ${args.filePath}:\n${symbols.join('\n')}`;
      }

      case 'workspaceSymbol': {
        const query = args.query || symbol;
        if (!query) return 'No query provided for workspaceSymbol.';
        const results = grepSymbol(query, filePath);
        if (results.length === 0) return `No symbols matching "${query}" found.`;
        return `Symbols matching "${query}":\n${results.slice(0, 15).join('\n')}`;
      }
    }

    return 'Unknown LSP operation';
  },
};
