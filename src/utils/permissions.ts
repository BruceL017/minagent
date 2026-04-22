export type PermissionMode = 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions' | 'dontAsk';
export type PermissionDecision = 'allow' | 'deny' | 'ask';

export interface PermissionRule {
  tool: string;
  decision: PermissionDecision;
}

export interface PermissionConfig {
  mode: PermissionMode;
  rules: PermissionRule[];
}

export function getDefaultPermissionConfig(): PermissionConfig {
  return {
    mode: 'default',
    rules: [],
  };
}

export function shouldAskPermission(
  toolName: string,
  config: PermissionConfig,
  isDestructive: boolean
): boolean {
  // Check explicit rules first
  const rule = config.rules.find((r) => r.tool === toolName);
  if (rule) {
    return rule.decision === 'ask';
  }

  // Mode-based decisions
  switch (config.mode) {
    case 'bypassPermissions':
    case 'dontAsk':
      return false;
    case 'acceptEdits':
      return toolName === 'BashTool' || toolName === 'DeleteTool';
    case 'plan':
      return true; // Ask for everything in plan mode
    case 'default':
    default:
      return isDestructive;
  }
}

export function getPermissionDescription(mode: PermissionMode): string {
  switch (mode) {
    case 'default':
      return 'Ask for destructive tools (write, edit, bash, delete)';
    case 'plan':
      return 'Ask for everything (plan mode)';
    case 'acceptEdits':
      return 'Auto-accept file edits, ask for bash/delete';
    case 'bypassPermissions':
      return 'Bypass all permission checks (dangerous)';
    case 'dontAsk':
      return 'Never ask for permissions (dangerous)';
    default:
      return 'Unknown mode';
  }
}
