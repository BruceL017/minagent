import type { Command } from './types.js';

export const changesCommand: Command = {
  name: 'changes',
  description: 'Show all file changes made in this session',
  execute: async (_args, ctx) => {
    return ctx.agent.getChangesetSummary();
  },
};
