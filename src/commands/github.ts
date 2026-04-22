import { spawnSync } from 'child_process';
import type { Command } from './types.js';

function runGh(args: string[], cwd: string, timeout = 30000): string {
  const result = spawnSync('gh', args, {
    cwd,
    encoding: 'utf-8',
    timeout,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) return `Error: ${result.error.message}`;
  if (result.status !== 0 && result.stderr) return `Error: ${result.stderr}`;
  return result.stdout || '(no output)';
}

export const ghPrListCommand: Command = {
  name: 'pr',
  description: 'List pull requests',
  execute: async (_args, ctx) => {
    return runGh(['pr', 'list', '--limit', '20'], ctx.cwd);
  },
};

export const ghPrViewCommand: Command = {
  name: 'pr-view',
  description: 'View a pull request',
  execute: async (args, ctx) => {
    const num = args.trim();
    if (!num) return 'Error: PR number required. Usage: /pr-view <number>';
    return runGh(['pr', 'view', num], ctx.cwd);
  },
};

export const ghPrCreateCommand: Command = {
  name: 'pr-create',
  description: 'Create a pull request',
  execute: async (args, ctx) => {
    const title = args.trim();
    if (!title) return 'Error: PR title required. Usage: /pr-create <title>';
    return runGh(['pr', 'create', '--title', title, '--body', ''], ctx.cwd);
  },
};

export const ghIssueListCommand: Command = {
  name: 'issue',
  description: 'List issues',
  execute: async (_args, ctx) => {
    return runGh(['issue', 'list', '--limit', '20'], ctx.cwd);
  },
};

export const ghIssueViewCommand: Command = {
  name: 'issue-view',
  description: 'View an issue',
  execute: async (args, ctx) => {
    const num = args.trim();
    if (!num) return 'Error: Issue number required. Usage: /issue-view <number>';
    return runGh(['issue', 'view', num], ctx.cwd);
  },
};

export const ghRepoViewCommand: Command = {
  name: 'repo',
  description: 'View repository information',
  execute: async (_args, ctx) => {
    return runGh(['repo', 'view'], ctx.cwd);
  },
};
