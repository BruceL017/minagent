import { z } from 'zod';
import type { Tool } from './types.js';
import { createLLMClient } from '../agent/llm.js';
import { executeToolCalls } from '../agent/toolExecutor.js';
import { defaultTools } from './index.js';
import type { Message, ToolCall } from '../types.js';

export const AgentToolSchema = z.object({
  description: z.string().describe('Description of the task for the sub-agent'),
  instructions: z.string().describe('Detailed instructions for the sub-agent'),
  max_iterations: z.number().optional().describe('Maximum tool iterations (default: 10)'),
});

export const AgentTool: Tool<typeof AgentToolSchema> = {
  name: 'AgentTool',
  description: 'Spawn a sub-agent to handle a specific task independently. Useful for parallel work or focused investigations.',
  schema: AgentToolSchema,
  async execute(args) {
    const provider = (process.env.MINA_PROVIDER || 'generic').toLowerCase();
    const apiKey = process.env.MINA_API_KEY || '';
    const model = process.env.MINA_MODEL || '';

    if (!apiKey) {
      return 'Error: MINA_API_KEY not set for sub-agent';
    }
    if (!model) {
      return 'Error: MINA_MODEL not set for sub-agent';
    }

    const config = {
      llmProvider: provider === 'anthropic' ? 'anthropic' as const : 'generic' as const,
      apiKey,
      model,
      maxToolIterations: args.max_iterations || 10,
      sandbox: true,
      globalSkillsDir: '',
      localSkillsDir: '',
      contextWindow: parseInt(process.env.MINA_CONTEXT_WINDOW || '128000', 10),
    };
    const llm = createLLMClient(config);
    const tools = defaultTools;

    const messages: Message[] = [
      {
        role: 'user',
        content: `Task: ${args.description}\n\nInstructions:\n${args.instructions}`,
      },
    ];

    const systemPrompt = `You are a focused sub-agent working on a specific task. Be thorough but concise. Report your findings clearly.`;

    let iteration = 0;
    let finalContent = '';

    try {
      while (iteration < (args.max_iterations || 10)) {
        iteration++;

        const stream = llm.stream(messages, tools, systemPrompt);
        let assistantContent = '';
        let assistantToolCalls: ToolCall[] | undefined;

        for await (const chunk of stream) {
          if (chunk.content) assistantContent += chunk.content;
          if (chunk.toolCalls) assistantToolCalls = chunk.toolCalls;
        }

        messages.push({
          role: 'assistant',
          content: assistantContent,
          toolCalls: assistantToolCalls,
        });

        finalContent = assistantContent;

        if (!assistantToolCalls || assistantToolCalls.length === 0) {
          break;
        }

        const results = await executeToolCalls(assistantToolCalls, tools);
        for (const result of results) {
          messages.push({
            role: 'tool',
            content: result.output,
            toolCallId: result.toolCallId,
          });
        }
      }

      return `[Sub-agent completed in ${iteration} iterations]\n\n${finalContent}`;
    } catch (err: any) {
      return `Sub-agent error: ${err.message}`;
    }
  },
};
