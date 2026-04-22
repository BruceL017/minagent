import { spawnSync } from 'child_process';
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

export const gitResetCommand: Command = {
  name: 'reset',
  description: 'Reset changes (soft/mixed/hard)',
  execute: async (args, ctx) => {
    const mode = args.trim() || '--mixed';
    return runGit(['reset', mode], ctx.cwd);
  },
};

export const gitMergeCommand: Command = {
  name: 'merge',
  description: 'Merge a branch',
  execute: async (args, ctx) => {
    if (!args.trim()) return 'Error: Branch name required. Usage: /merge <branch>';
    return runGit(['merge', args.trim()], ctx.cwd);
  },
};

export const gitRebaseCommand: Command = {
  name: 'rebase',
  description: 'Rebase onto a branch',
  execute: async (args, ctx) => {
    if (!args.trim()) return 'Error: Branch name required. Usage: /rebase <branch>';
    return runGit(['rebase', args.trim()], ctx.cwd);
  },
};

export const gitTagCommand: Command = {
  name: 'tag',
  description: 'List tags or create a tag',
  execute: async (args, ctx) => {
    if (!args.trim()) return runGit(['tag', '-l'], ctx.cwd);
    return runGit(['tag', args.trim()], ctx.cwd);
  },
};

export const gitRemoteCommand: Command = {
  name: 'remote',
  description: 'Show remote repositories',
  execute: async (_args, ctx) => {
    return runGit(['remote', '-v'], ctx.cwd);
  },
};

export const gitPullCommand: Command = {
  name: 'pull',
  description: 'Pull changes from remote',
  execute: async (_args, ctx) => {
    return runGit(['pull'], ctx.cwd);
  },
};

export const gitShowCommand: Command = {
  name: 'show',
  description: 'Show commit details',
  execute: async (args, ctx) => {
    const ref = args.trim() || 'HEAD';
    return runGit(['show', '--stat', ref], ctx.cwd);
  },
};

export const gitCherryPickCommand: Command = {
  name: 'cherry-pick',
  description: 'Cherry-pick a commit onto current branch',
  execute: async (args, ctx) => {
    if (!args.trim()) return 'Error: Commit hash required. Usage: /cherry-pick <commit>';
    return runGit(['cherry-pick', args.trim()], ctx.cwd);
  },
};

export const gitBlameCommand: Command = {
  name: 'blame',
  description: 'Show who last modified each line of a file',
  execute: async (args, ctx) => {
    if (!args.trim()) return 'Error: File path required. Usage: /blame <filepath>';
    return runGit(['blame', args.trim()], ctx.cwd);
  },
};

export const gitBisectCommand: Command = {
  name: 'bisect',
  description: 'Binary search for the commit that introduced a bug',
  execute: async (args, ctx) => {
    const sub = args.trim();
    if (!sub) return 'Usage: /bisect start | /bisect good | /bisect bad | /bisect reset';
    const [cmd, ...rest] = sub.split(' ');
    if (cmd === 'start') return runGit(['bisect', 'start'], ctx.cwd);
    if (cmd === 'good') return runGit(['bisect', 'good', ...rest], ctx.cwd);
    if (cmd === 'bad') return runGit(['bisect', 'bad', ...rest], ctx.cwd);
    if (cmd === 'reset') return runGit(['bisect', 'reset'], ctx.cwd);
    return `Unknown bisect subcommand: ${cmd}`;
  },
};

export const gitStashPopCommand: Command = {
  name: 'stash-pop',
  description: 'Pop the latest stash entry',
  execute: async (_args, ctx) => {
    return runGit(['stash', 'pop'], ctx.cwd);
  },
};

export const gitStashListCommand: Command = {
  name: 'stash-list',
  description: 'List stash entries',
  execute: async (_args, ctx) => {
    return runGit(['stash', 'list'], ctx.cwd);
  },
};
