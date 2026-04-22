import { spawnSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { z } from 'zod';
import type { Tool } from './types.js';

export const CodeExecuteToolSchema = z.object({
  language: z.enum(['python', 'node', 'bash']).describe('Language to execute'),
  code: z.string().describe('Code to execute'),
  timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
});

export const CodeExecuteTool: Tool<typeof CodeExecuteToolSchema> = {
  name: 'CodeExecuteTool',
  description: 'Execute a code snippet in an isolated temporary directory. Supports Python, Node.js, and Bash. stdout/stderr are returned. Use for data processing, quick calculations, or testing code logic.',
  schema: CodeExecuteToolSchema,
  async execute(args) {
    const dir = mkdtempSync(join(tmpdir(), 'minagent-exec-'));
    const timeout = args.timeout || 30000;

    try {
      let result;

      if (args.language === 'python') {
        const file = join(dir, 'script.py');
        writeFileSync(file, args.code, 'utf-8');
        result = spawnSync('python3', [file], {
          cwd: dir,
          encoding: 'utf-8',
          timeout,
          maxBuffer: 5 * 1024 * 1024,
        });
      } else if (args.language === 'node') {
        const file = join(dir, 'script.js');
        writeFileSync(file, args.code, 'utf-8');
        result = spawnSync('node', [file], {
          cwd: dir,
          encoding: 'utf-8',
          timeout,
          maxBuffer: 5 * 1024 * 1024,
        });
      } else {
        const file = join(dir, 'script.sh');
        writeFileSync(file, args.code, 'utf-8');
        result = spawnSync('bash', [file], {
          cwd: dir,
          encoding: 'utf-8',
          timeout,
          maxBuffer: 5 * 1024 * 1024,
        });
      }

      let output = '';
      if (result.stdout) output += result.stdout;
      if (result.stderr) output += `\n[stderr]: ${result.stderr}`;

      if (result.status !== 0) {
        output += `\n[exit code: ${result.status}]`;
      }

      const MAX_LEN = 20000;
      if (output.length > MAX_LEN) {
        output = output.slice(0, MAX_LEN) + `\n... [truncated, ${output.length - MAX_LEN} chars hidden]`;
      }

      return output || '(no output)';
    } catch (err: any) {
      return `Error: ${err.message}`;
    } finally {
      try {
        rmSync(dir, { recursive: true });
      } catch {
        // ignore cleanup errors
      }
    }
  },
};
