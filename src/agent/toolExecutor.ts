import type { ToolCall, ToolResult } from '../types.js';
import type { ToolRegistry } from '../tools/types.js';
import { READONLY_TOOLS, DESTRUCTIVE_TOOLS } from '../tools/index.js';

function isReadOnlyTool(name: string): boolean {
  return READONLY_TOOLS.has(name);
}

function isDestructiveTool(name: string): boolean {
  return DESTRUCTIVE_TOOLS.has(name);
}

async function executeSingleTool(
  tc: ToolCall,
  tools: ToolRegistry
): Promise<ToolResult> {
  const tool = tools[tc.name];
  if (!tool) {
    return {
      toolCallId: tc.id,
      name: tc.name,
      output: `Error: Tool "${tc.name}" not found`,
      error: true,
    };
  }

  try {
    const validated = tool.schema.parse(tc.arguments);
    const output = await tool.execute(validated);
    return {
      toolCallId: tc.id,
      name: tc.name,
      output,
      error: false,
    };
  } catch (err: any) {
    return {
      toolCallId: tc.id,
      name: tc.name,
      output: `Error: ${err.message}`,
      error: true,
    };
  }
}

/**
 * Execute tool calls with smart concurrency:
 * - Read-only tools run in parallel
 * - Destructive tools run sequentially to avoid conflicts
 * - Mixed batches: run read-only first in parallel, then destructive sequentially
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  tools: ToolRegistry
): Promise<ToolResult[]> {
  const readonlyCalls: ToolCall[] = [];
  const destructiveCalls: ToolCall[] = [];

  for (const tc of toolCalls) {
    if (isReadOnlyTool(tc.name)) {
      readonlyCalls.push(tc);
    } else {
      destructiveCalls.push(tc);
    }
  }

  const results: ToolResult[] = [];

  // Run read-only tools in parallel
  if (readonlyCalls.length > 0) {
    const readonlyResults = await Promise.all(
      readonlyCalls.map((tc) => executeSingleTool(tc, tools))
    );
    results.push(...readonlyResults);
  }

  // Run destructive tools sequentially
  for (const tc of destructiveCalls) {
    const result = await executeSingleTool(tc, tools);
    results.push(result);
  }

  // Preserve original order
  const resultMap = new Map<string, ToolResult>();
  for (const r of results) {
    resultMap.set(r.toolCallId, r);
  }

  return toolCalls.map((tc) => resultMap.get(tc.id)!);
}
