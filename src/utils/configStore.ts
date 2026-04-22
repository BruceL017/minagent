import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface PersistentConfig {
  [key: string]: string;
}

function getConfigPath(): string {
  return join(homedir(), '.minagent', 'config.json');
}

export function loadPersistentConfig(): PersistentConfig {
  const path = getConfigPath();
  if (!existsSync(path)) return {};
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as PersistentConfig;
  } catch {
    return {};
  }
}

export function savePersistentConfig(config: PersistentConfig): void {
  const path = getConfigPath();
  const dir = join(homedir(), '.minagent');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8');
}

export function setPersistentConfig(key: string, value: string): void {
  const config = loadPersistentConfig();
  config[key] = value;
  savePersistentConfig(config);
}

export function getPersistentConfig(key: string): string | undefined {
  return loadPersistentConfig()[key];
}

/**
 * Apply persistent config to environment variables.
 * Called at startup so persistent settings take effect.
 */
export function applyPersistentConfig(): void {
  const config = loadPersistentConfig();
  for (const [key, value] of Object.entries(config)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
