export interface MCPServerConfig {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export class MCPManager {
  private servers = new Map<string, MCPServerConfig>();

  register(config: MCPServerConfig): void {
    this.servers.set(config.name, config);
  }

  list(): MCPServerConfig[] {
    return Array.from(this.servers.values());
  }

  get(name: string): MCPServerConfig | undefined {
    return this.servers.get(name);
  }

  remove(name: string): boolean {
    return this.servers.delete(name);
  }
}

export function loadMCPConfig(): MCPManager {
  const manager = new MCPManager();
  // TODO: Load from ~/.minagent/mcp.json
  return manager;
}
