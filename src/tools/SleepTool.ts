import { z } from 'zod';
import type { Tool } from './types.js';

export const SleepToolSchema = z.object({
  seconds: z.number().min(1).max(300).describe('Seconds to sleep (1-300)'),
  reason: z.string().optional().describe('Why we are waiting'),
});

export const SleepTool: Tool<typeof SleepToolSchema> = {
  name: 'SleepTool',
  description: 'Wait for a specified number of seconds. Useful when waiting for builds, tests, or external processes to complete.',
  schema: SleepToolSchema,
  async execute(args) {
    await new Promise((resolve) => setTimeout(resolve, args.seconds * 1000));
    return args.reason ? `Waited ${args.seconds}s: ${args.reason}` : `Waited ${args.seconds}s`;
  },
};
