import type { Command } from './types.js';
import { listThemes } from '../utils/theme.js';

export const themeCommand: Command = {
  name: 'theme',
  description: 'List or change terminal theme',
  execute: async (args) => {
    if (!args.trim()) {
      return listThemes();
    }
    const name = args.trim();
    process.env.MINA_THEME = name;
    return `Theme set to: ${name} (restart to apply)`;
  },
};
