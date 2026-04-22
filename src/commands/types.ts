import type { Agent } from '../agent/index.js';
import type { SkillRegistry } from '../skills/registry.js';
import type { ToolRegistry } from '../tools/types.js';

export interface CommandContext {
  agent: Agent;
  tools: ToolRegistry;
  skills: SkillRegistry;
  cwd: string;
}

export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  hidden?: boolean;
  execute: (args: string, ctx: CommandContext) => Promise<string | void>;
}

export type CommandRegistry = Map<string, Command>;
