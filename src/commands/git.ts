import { execSync, spawnSync } from 'child_process';
import type { Command } from './types.js';

function runGit(args: string[], cwd: string, timeout = 30000): string {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf-8',
    timeout,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) return `Error: ${result.error.message}`;
  if (result.status !== 0 && result.stderr) return `Error: ${result.stderr}`;
  return result.stdout || '(no output)';
}

export const gitStatusCommand: Command = {
  name: 'status',
  description: 'Show git working tree status',
  execute: async (_args, ctx) => {
    return runGit(['status', '--short'], ctx.cwd);
  },
};

export const gitDiffCommand: Command = {
  name: 'diff',
  description: 'Show unstaged changes',
  execute: async (_args, ctx) => {
    return runGit(['diff'], ctx.cwd);
  },
};

export const gitDiffStagedCommand: Command = {
  name: 'diff-staged',
  description: 'Show staged changes',
  execute: async (_args, ctx) => {
    return runGit(['diff', '--staged'], ctx.cwd);
  },
};

export const gitLogCommand: Command = {
  name: 'log',
  description: 'Show recent commit history',
  execute: async (args, ctx) => {
    const n = args.trim() || '10';
    return runGit(['log', '--oneline', `-${n}`], ctx.cwd);
  },
};

export const gitCommitCommand: Command = {
  name: 'commit',
  description: 'Create a git commit with the given message',
  execute: async (args, ctx) => {
    if (!args.trim()) {
      return 'Error: Commit message required. Usage: /commit <message>';
    }
    // Stage all changes first
    runGit(['add', '-A'], ctx.cwd);
    return runGit(['commit', '-m', args.trim()], ctx.cwd);
  },
};

export const gitBranchCommand: Command = {
  name: 'branch',
  description: 'List branches',
  execute: async (_args, ctx) => {
    return runGit(['branch', '-v'], ctx.cwd);
  },
};

export const gitCheckoutCommand: Command = {
  name: 'checkout',
  description: 'Checkout a branch or commit',
  execute: async (args, ctx) => {
    if (!args.trim()) return 'Error: Branch name required. Usage: /checkout <branch>';
    return runGit(['checkout', args.trim()], ctx.cwd);
  },
};

export const gitStashCommand: Command = {
  name: 'stash',
  description: 'Stash current changes',
  execute: async (_args, ctx) => {
    return runGit(['stash', 'push'], ctx.cwd);
  },
};

export const gitPushCommand: Command = {
  name: 'push',
  description: 'Push current branch to remote',
  execute: async (_args, ctx) => {
    return runGit(['push'], ctx.cwd);
  },
};
