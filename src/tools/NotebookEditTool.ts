import { z } from 'zod';
import { readFileSync, writeFileSync } from 'fs';
import type { Tool } from './types.js';

export const NotebookEditToolSchema = z.object({
  operation: z.enum(['read', 'write_cell', 'add_cell', 'delete_cell']).describe('Notebook operation'),
  path: z.string().describe('Path to the .ipynb file'),
  cell_index: z.number().optional().describe('Cell index (0-based) for write/delete'),
  cell_type: z.enum(['code', 'markdown']).optional().describe('Cell type for add_cell'),
  source: z.string().optional().describe('Cell source content for write/add'),
});

interface NotebookCell {
  cell_type: string;
  source: string | string[];
  metadata?: Record<string, unknown>;
  outputs?: unknown[];
}

interface Notebook {
  cells: NotebookCell[];
  metadata: Record<string, unknown>;
  nbformat: number;
  nbformat_minor: number;
}

function readNotebook(path: string): Notebook {
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

function writeNotebook(path: string, notebook: Notebook): void {
  writeFileSync(path, JSON.stringify(notebook, null, 2));
}

function formatCell(cell: NotebookCell, index: number): string {
  const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
  const preview = source.slice(0, 200).replace(/\n/g, '\\n');
  return `Cell ${index} [${cell.cell_type}]: ${preview}${source.length > 200 ? '...' : ''}`;
}

export const NotebookEditTool: Tool<typeof NotebookEditToolSchema> = {
  name: 'NotebookEditTool',
  description: 'Read or edit Jupyter notebook (.ipynb) files. Supports reading all cells, editing a cell, adding a cell, or deleting a cell.',
  schema: NotebookEditToolSchema,
  async execute(args) {
    if (args.operation === 'read') {
      const nb = readNotebook(args.path);
      const lines = [
        `Notebook: ${args.path}`,
        `Format: ${nb.nbformat}.${nb.nbformat_minor}`,
        `Cells: ${nb.cells.length}`,
        '',
        ...nb.cells.map((c, i) => formatCell(c, i)),
      ];
      return lines.join('\n');
    }

    if (args.operation === 'write_cell') {
      const idx = args.cell_index;
      if (idx === undefined || args.source === undefined) {
        return 'Error: cell_index and source required for write_cell';
      }
      const nb = readNotebook(args.path);
      if (idx < 0 || idx >= nb.cells.length) {
        return `Error: cell_index ${idx} out of range (0-${nb.cells.length - 1})`;
      }
      const cell = nb.cells[idx];
      if (cell) {
        cell.source = args.source!;
      }
      writeNotebook(args.path, nb);
      return `Updated cell ${idx} in ${args.path}`;
    }

    if (args.operation === 'add_cell') {
      if (args.cell_type === undefined || args.source === undefined) {
        return 'Error: cell_type and source required for add_cell';
      }
      const nb = readNotebook(args.path);
      const newCell: NotebookCell = {
        cell_type: args.cell_type,
        source: args.source,
        metadata: {},
      };
      if (args.cell_index !== undefined) {
        nb.cells.splice(args.cell_index, 0, newCell);
      } else {
        nb.cells.push(newCell);
      }
      writeNotebook(args.path, nb);
      return `Added ${args.cell_type} cell to ${args.path} at index ${args.cell_index ?? nb.cells.length - 1}`;
    }

    if (args.operation === 'delete_cell') {
      if (args.cell_index === undefined) {
        return 'Error: cell_index required for delete_cell';
      }
      const nb = readNotebook(args.path);
      if (args.cell_index < 0 || args.cell_index >= nb.cells.length) {
        return `Error: cell_index ${args.cell_index} out of range`;
      }
      nb.cells.splice(args.cell_index, 1);
      writeNotebook(args.path, nb);
      return `Deleted cell ${args.cell_index} from ${args.path}`;
    }

    return 'Unknown operation';
  },
};
