import type { Command } from './types.js';
import { listMCPServers } from '../tools/MCPTool.js';

export const mcpCommand: Command = {
  name: 'mcp',
  description: 'List configured MCP servers and their tools',
  execute: async (_args) => {
    return await listMCPServers();
  },
};
