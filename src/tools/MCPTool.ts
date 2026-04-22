import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool } from './types.js';

export const MCPToolSchema = z.object({
  server: z.string().describe('MCP server name (as configured in mcp.json)'),
  tool: z.string().describe('Tool name to call on the MCP server'),
  arguments: z.record(z.string(), z.unknown()).optional().describe('Tool arguments'),
});

interface MCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

// In-memory cache of MCP clients
const mcpClients = new Map<string, Client>();
const SAFE_MCP_ENV_KEYS = [
  'PATH',
  'HOME',
  'USER',
  'LOGNAME',
  'SHELL',
  'TERM',
  'TMPDIR',
  'TMP',
  'TEMP',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TZ',
  'PWD',
];

function loadMCPServers(): MCPServer[] {
  try {
    const { readFileSync } = require('fs');
    const { join } = require('path');
    const { homedir } = require('os');
    const configPath = join(homedir(), '.minagent', 'mcp.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return Object.entries(config.mcpServers || {}).map(([name, server]: [string, any]) => ({
      name,
      command: server.command,
      args: server.args,
      env: server.env,
    }));
  } catch {
    return [];
  }
}

async function getMCPClient(serverName: string): Promise<Client | null> {
  if (mcpClients.has(serverName)) {
    return mcpClients.get(serverName)!;
  }

  const servers = loadMCPServers();
  const server = servers.find((s) => s.name === serverName);
  if (!server) return null;

  const client = new Client(
    { name: 'minagent', version: '0.2.0' },
    { capabilities: {} }
  );
  const env: Record<string, string> = {};
  for (const key of SAFE_MCP_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) {
      env[key] = value;
    }
  }
  if (server.env) {
    for (const [k, v] of Object.entries(server.env)) {
      env[k] = v;
    }
  }
  const transport = new StdioClientTransport({
    command: server.command,
    args: server.args || [],
    env,
  });

  await client.connect(transport);
  mcpClients.set(serverName, client);
  return client;
}

export const MCPTool: Tool<typeof MCPToolSchema> = {
  name: 'MCPTool',
  description: 'Call a tool on an external MCP (Model Context Protocol) server. MCP servers extend the agent with additional capabilities like database access, file system operations, API integrations, etc. Configure servers in ~/.minagent/mcp.json.',
  schema: MCPToolSchema,
  async execute(args) {
    const client = await getMCPClient(args.server);
    if (!client) {
      return `Error: MCP server "${args.server}" not found. Configure it in ~/.minagent/mcp.json`;
    }

    try {
      const result = await client.callTool({
        name: args.tool,
        arguments: args.arguments || {},
      });

      // Extract text content from result
      const texts: string[] = [];
      for (const item of result.content as any[]) {
        if (item.type === 'text') {
          texts.push(item.text);
        }
      }
      return texts.join('\n') || JSON.stringify(result);
    } catch (err: any) {
      return `Error calling MCP tool: ${err.message}`;
    }
  },
};

export async function listMCPServers(): Promise<string> {
  const servers = loadMCPServers();
  if (servers.length === 0) {
    return 'No MCP servers configured. Add them to ~/.minagent/mcp.json';
  }

  const lines = ['Configured MCP servers:'];
  for (const server of servers) {
    try {
      const client = await getMCPClient(server.name);
      if (client) {
        const tools = await client.listTools();
        lines.push(`  ${server.name}: ${tools.tools.length} tools available`);
        for (const tool of tools.tools.slice(0, 5)) {
          lines.push(`    - ${tool.name}: ${tool.description?.slice(0, 80) || 'No description'}`);
        }
        if (tools.tools.length > 5) {
          lines.push(`    ... and ${tools.tools.length - 5} more`);
        }
      }
    } catch (err: any) {
      lines.push(`  ${server.name}: Error - ${err.message}`);
    }
  }
  return lines.join('\n');
}
