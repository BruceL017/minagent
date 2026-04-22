import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import type { Tool } from './types.js';

export const LsToolSchema = z.object({
  path: z.string().describe('Directory path to list'),
  limit: z.number().optional().describe('Maximum number of entries (default: 50)'),
});

export const LsTool: Tool<typeof LsToolSchema> = {
  name: 'LsTool',
  description: 'List files and directories in a given path with sizes and modification times.',
  schema: LsToolSchema,
  async execute(args) {
    try {
      const entries = readdirSync(args.path, { withFileTypes: true });
      const limit = args.limit || 50;

      const items = entries.slice(0, limit).map((entry) => {
        const fullPath = join(args.path, entry.name);
        let size = '';
        let mtime = '';
        try {
          const stats = statSync(fullPath);
          size = formatSize(stats.size);
          mtime = stats.mtime.toISOString().slice(0, 16).replace('T', ' ');
        } catch {
          // ignore
        }
        const icon = entry.isDirectory() ? 'd' : entry.isSymbolicLink() ? 'l' : '-';
        return `${icon} ${entry.name.padEnd(30)} ${size.padStart(8)} ${mtime}`;
      });

      let output = `Directory: ${args.path}\n${'-'.repeat(60)}\n`;
      output += items.join('\n');

      if (entries.length > limit) {
        output += `\n... (${entries.length - limit} more entries)`;
      }

      return output;
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}M`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}G`;
}
