import { readFileSync } from 'fs';
import { z } from 'zod';
import type { Tool } from './types.js';

export const FileReadToolSchema = z.object({
  file_path: z.string().describe('Absolute path to the file to read'),
  offset: z.number().optional().describe('Line number to start reading from (1-indexed)'),
  limit: z.number().optional().describe('Maximum number of lines to read'),
});

export const FileReadTool: Tool<typeof FileReadToolSchema> = {
  name: 'FileReadTool',
  description: 'Read the contents of a file. Supports offset and limit for large files.',
  schema: FileReadToolSchema,
  async execute(args) {
    try {
      const content = readFileSync(args.file_path, 'utf-8');
      const lines = content.split('\n');

      const offset = (args.offset || 1) - 1;
      const limit = args.limit || lines.length;

      if (offset < 0 || offset >= lines.length) {
        return `Error: offset ${args.offset} is out of range (file has ${lines.length} lines)`;
      }

      const selected = lines.slice(offset, offset + limit);
      const startLine = offset + 1;
      const numbered = selected.map((line, i) => `${String(startLine + i).padStart(4)}  ${line}`);
      let output = numbered.join('\n');

      const MAX_LEN = 50000;
      if (output.length > MAX_LEN) {
        output = output.slice(0, MAX_LEN) + `\n... [truncated, ${output.length - MAX_LEN} chars hidden]`;
      }

      return output;
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
};
