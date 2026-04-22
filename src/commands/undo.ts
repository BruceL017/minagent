import type { Command } from './types.js';
import { globalEditHistory } from '../tools/FileEditTool.js';

export const undoCommand: Command = {
  name: 'undo',
  description: 'Undo the last file edit',
  execute: async () => {
    if (!globalEditHistory.canUndo()) {
      return 'Nothing to undo.';
    }
    const record = globalEditHistory.undo();
    if (record) {
      return `Undone edit to ${record.filePath}`;
    }
    return 'Failed to undo.';
  },
};

export const redoCommand: Command = {
  name: 'redo',
  description: 'Redo the last undone file edit',
  execute: async () => {
    if (!globalEditHistory.canRedo()) {
      return 'Nothing to redo.';
    }
    const record = globalEditHistory.redo();
    if (record) {
      return `Redone edit to ${record.filePath}`;
    }
    return 'Failed to redo.';
  },
};

export const historyCommand: Command = {
  name: 'history',
  description: 'Show file edit history',
  execute: async () => {
    return globalEditHistory.getHistory();
  },
};
