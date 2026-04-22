import { z } from 'zod';
import type { Tool } from './types.js';

interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

const todos = new Map<string, TodoItem[]>();

export const TodoToolSchema = z.object({
  operation: z.enum(['list', 'add', 'update', 'delete']).describe('Operation to perform'),
  id: z.string().optional().describe('Todo item ID (for update/delete)'),
  content: z.string().optional().describe('Todo content (for add/update)'),
  status: z.enum(['pending', 'in_progress', 'completed']).optional().describe('Status (for update)'),
});

function getSessionTodos(): TodoItem[] {
  const sessionId = process.pid.toString();
  if (!todos.has(sessionId)) {
    todos.set(sessionId, []);
  }
  return todos.get(sessionId)!;
}

export const TodoTool: Tool<typeof TodoToolSchema> = {
  name: 'TodoTool',
  description: 'Manage a session todo list. Use this to track tasks and progress during a complex operation.',
  schema: TodoToolSchema,
  async execute(args) {
    const list = getSessionTodos();

    if (args.operation === 'list') {
      if (list.length === 0) return 'No todos yet.';
      return list.map((t) => `[${t.status}] ${t.id}: ${t.content}`).join('\n');
    }

    if (args.operation === 'add') {
      if (!args.content) return 'Error: content required for add';
      const id = `todo-${list.length + 1}`;
      list.push({ id, content: args.content, status: 'pending' });
      return `Added ${id}: ${args.content}`;
    }

    if (args.operation === 'update') {
      if (!args.id) return 'Error: id required for update';
      const item = list.find((t) => t.id === args.id);
      if (!item) return `Error: todo ${args.id} not found`;
      if (args.content) item.content = args.content;
      if (args.status) item.status = args.status;
      return `Updated ${args.id}`;
    }

    if (args.operation === 'delete') {
      if (!args.id) return 'Error: id required for delete';
      const idx = list.findIndex((t) => t.id === args.id);
      if (idx === -1) return `Error: todo ${args.id} not found`;
      list.splice(idx, 1);
      return `Deleted ${args.id}`;
    }

    return 'Unknown operation';
  },
};
