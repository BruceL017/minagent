import { z } from 'zod';

export interface Tool<TSchema extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: TSchema;
  execute: (args: z.infer<TSchema>) => Promise<string>;
}

export interface ToolRegistry {
  [name: string]: Tool;
}
