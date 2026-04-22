import { execSync, spawnSync } from 'child_process';
import { z } from 'zod';
import type { Tool } from './types.js';

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  />\s*\/dev\/null.*&&.*rm/,
  /curl.*\|.*bash/,
  /wget.*\|.*sh/,
  /:\(\)\{\s*:\|\:\&\s*\};/,
  /mkfs/,
  /dd\s+if=.*of=\/dev/,
  />\s*\/etc\/passwd/,
];

function isDangerous(command: string): string | null {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return `Blocked dangerous pattern: ${pattern.source}`;
    }
  }
  return null;
}

export const BashToolSchema = z.object({
  command: z.string().describe('The shell command to execute'),
  description: z.string().optional().describe('Short description of what this command does'),
  timeout: z.number().optional().describe('Timeout in milliseconds (default: 120000)'),
  cwd: z.string().optional().describe('Working directory for the command (default: current directory)'),
});

export const BashTool: Tool<typeof BashToolSchema> = {
  name: 'BashTool',
  description: 'Execute shell commands. Use for file operations, git, builds, tests, running scripts, and any shell operations. Always describe what the command does.',
  schema: BashToolSchema,
  async execute(args) {
    const danger = isDangerous(args.command);
    if (danger) {
      return `Error: ${danger}`;
    }

    try {
      const timeout = args.timeout || 120000;
      const result = spawnSync(args.command, {
        shell: true,
        encoding: 'utf-8',
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        env: process.env,
        cwd: args.cwd || process.cwd(),
      });

      let output = '';
      if (result.stdout) output += result.stdout;
      if (result.stderr) output += `\n[stderr]: ${result.stderr}`;

      if (result.error) {
        return `Error: ${result.error.message}`;
      }
      if (result.status !== 0) {
        output += `\n[exit code: ${result.status}]`;
      }

      // Truncate very long output
      const MAX_LEN = 30000;
      if (output.length > MAX_LEN) {
        output = output.slice(0, MAX_LEN) + `\n... [truncated, ${output.length - MAX_LEN} chars hidden]`;
      }

      return output || '(no output)';
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
};
