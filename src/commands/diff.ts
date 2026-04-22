import type { Command } from './types.js';

export const diffCommand: Command = {
  name: 'diff',
  description: 'Show detailed diff of all session changes',
  execute: async (_args, ctx) => {
    return ctx.agent.getChangesetDiff();
  },
};
