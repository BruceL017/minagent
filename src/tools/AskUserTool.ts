import { z } from 'zod';
import type { Tool } from './types.js';

export const AskUserToolSchema = z.object({
  question: z.string().describe('The question to ask the user'),
  options: z.array(z.string()).optional().describe('Optional list of choices for the user to pick from'),
});

export const AskUserTool: Tool<typeof AskUserToolSchema> = {
  name: 'AskUserTool',
  description: 'Ask the user a question and wait for their response. Use when you need clarification or user input.',
  schema: AskUserToolSchema,
  async execute(args) {
    // This is a special tool - the actual implementation is handled by the agent loop
    // which intercepts this and pauses for user input
    return `[ASK_USER] ${args.question}${args.options ? `\nOptions: ${args.options.join(', ')}` : ''}`;
  },
};
