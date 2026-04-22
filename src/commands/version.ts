import type { Command } from './types.js';

export const versionCommand: Command = {
  name: 'version',
  description: 'Show version information',
  execute: async () => {
    return 'MinAgent v0.2.0';
  },
};
