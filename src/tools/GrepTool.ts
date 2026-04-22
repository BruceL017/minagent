import { execSync } from 'child_process';
import { z } from 'zod';
import type { Tool } from './types.js';

export const GrepToolSchema = z.object({
  pattern: z.string().describe('Regex pattern to search for'),
  path: z.string().optional().describe('Directory or file to search in (default: current directory)'),
  include: z.string().optional().describe('Glob pattern for files to include (e.g. "*.ts")'),
  exclude: z.string().optional().describe('Glob pattern for files to exclude'),
  case_sensitive: z.boolean().optional().describe('Case sensitive search (default: true)'),
  context_lines: z.number().optional().describe('Number of context lines to show around each match (default: 2)'),
});

export const GrepTool: Tool<typeof GrepToolSchema> = {
  name: 'GrepTool',
  description: 'Search file contents using ripgrep. Fast regex-based text search across the codebase. Prefer this over BashTool for searching code.',
  schema: GrepToolSchema,
  async execute(args) {
    try {
      const cmdParts = ['rg'];

      if (!args.case_sensitive) {
        cmdParts.push('-i');
      }

      cmdParts.push('--line-number');
      cmdParts.push('--color=never');
      cmdParts.push('--max-count=5');
      cmdParts.push('--max-columns=400');

      const contextLines = args.context_lines ?? 2;
      if (contextLines > 0) {
        cmdParts.push('-C', String(contextLines));
      }

      if (args.include) {
        cmdParts.push('-g', args.include);
      }
      if (args.exclude) {
        cmdParts.push('-g', `!${args.exclude}`);
      }

      // Exclude common non-source directories by default
      cmdParts.push('-g', '!node_modules');
      cmdParts.push('-g', '!dist');
      cmdParts.push('-g', '!build');
      cmdParts.push('-g', '!.git');

      cmdParts.push('-e', args.pattern);

      if (args.path) {
        cmdParts.push(args.path);
      } else {
        cmdParts.push('.');
      }

      const result = execSync(cmdParts.join(' '), {
        encoding: 'utf-8',
        maxBuffer: 5 * 1024 * 1024,
        timeout: 30000,
      });

      const lines = result.split('\n').filter((l) => l.trim());
      if (lines.length > 300) {
        return lines.slice(0, 300).join('\n') + `\n... [${lines.length - 300} more lines]`;
      }
      return result || '(no matches)';
    } catch (err: any) {
      if (err.status === 1) return '(no matches)';
      if (err.status === 127) return 'Error: ripgrep (rg) not installed. Install it first.';
      return `Error: ${err.message}`;
    }
  },
};
