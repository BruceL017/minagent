import { execSync } from 'child_process';
import { z } from 'zod';
import type { Tool } from './types.js';

export const GlobToolSchema = z.object({
  pattern: z.string().describe('Glob pattern to match files (e.g. "src/**/*.ts")'),
  path: z.string().optional().describe('Directory to search in (default: current directory)'),
  exclude: z.string().optional().describe('Glob pattern for files to exclude'),
  limit: z.number().optional().describe('Maximum number of results (default: 100)'),
});

export const GlobTool: Tool<typeof GlobToolSchema> = {
  name: 'GlobTool',
  description: 'Find files matching a glob pattern. Use for discovering files by name pattern.',
  schema: GlobToolSchema,
  async execute(args) {
    try {
      const cmdParts = ['find'];
      cmdParts.push(args.path || '.');
      cmdParts.push('-type', 'f');

      // Use find with -name for simple patterns, or fallback to fd if available
      const limit = args.limit || 100;

      let result: string;
      try {
        // Try fd first (faster, glob support)
        const fdCmd = ['fd', '--type', 'f', '--max-results', String(limit)];
        if (args.exclude) {
          fdCmd.push('--exclude', args.exclude);
        }
        fdCmd.push(args.pattern);
        if (args.path) fdCmd.push(args.path);

        result = execSync(fdCmd.join(' '), {
          encoding: 'utf-8',
          maxBuffer: 5 * 1024 * 1024,
          timeout: 15000,
        });
      } catch {
        // Fallback to find
        const findCmd = ['find', args.path || '.', '-type', 'f'];
        const findResult = execSync(findCmd.join(' '), {
          encoding: 'utf-8',
          maxBuffer: 5 * 1024 * 1024,
          timeout: 30000,
        });

        const lines = findResult.split('\n').filter((l) => l.trim());
        // Simple glob matching
        const regex = globToRegex(args.pattern);
        const filtered = lines.filter((l) => regex.test(l));
        result = filtered.slice(0, limit).join('\n');
      }

      const lines = result.split('\n').filter((l) => l.trim());
      if (lines.length === 0) return '(no files found)';
      if (lines.length >= limit) {
        return lines.join('\n') + `\n... [showing first ${limit} results]`;
      }
      return lines.join('\n');
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
};

function globToRegex(pattern: string): RegExp {
  let regex = pattern
    .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<DOUBLESTAR>>>/g, '.*')
    .replace(/\?/g, '[^/]');
  return new RegExp(regex);
}
