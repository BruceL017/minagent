import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import type { Command } from './types.js';

export const formatCommand: Command = {
  name: 'format',
  description: 'Auto-format code in the current project',
  execute: async (_args, ctx) => {
    const cwd = ctx.cwd;

    // Detect formatter
    if (existsSync(`${cwd}/package.json`)) {
      try {
        const pkg = JSON.parse(
          require('fs').readFileSync(`${cwd}/package.json`, 'utf-8')
        );
        if (pkg.devDependencies?.prettier || pkg.dependencies?.prettier) {
          const result = spawnSync('npx', ['prettier', '--write', '.'], {
            cwd,
            encoding: 'utf-8',
            timeout: 60000,
            maxBuffer: 10 * 1024 * 1024,
          });
          return result.stdout || result.stderr || 'Prettier completed.';
        }
        if (pkg.devDependencies?.eslint || pkg.dependencies?.eslint) {
          const result = spawnSync('npx', ['eslint', '--fix', '.'], {
            cwd,
            encoding: 'utf-8',
            timeout: 60000,
            maxBuffer: 10 * 1024 * 1024,
          });
          return result.stdout || result.stderr || 'ESLint fix completed.';
        }
      } catch {
        // ignore
      }
    }

    if (existsSync(`${cwd}/Cargo.toml`)) {
      const result = spawnSync('cargo', ['fmt'], {
        cwd,
        encoding: 'utf-8',
        timeout: 60000,
      });
      return result.stdout || result.stderr || 'cargo fmt completed.';
    }

    if (existsSync(`${cwd}/go.mod`)) {
      const result = spawnSync('go', ['fmt', './...'], {
        cwd,
        encoding: 'utf-8',
        timeout: 60000,
      });
      return result.stdout || result.stderr || 'go fmt completed.';
    }

    if (existsSync(`${cwd}/pyproject.toml`) || existsSync(`${cwd}/setup.py`)) {
      // Try ruff first, then black
      const ruff = spawnSync('ruff', ['format', '.'], {
        cwd,
        encoding: 'utf-8',
        timeout: 60000,
      });
      if (ruff.status === 0) return ruff.stdout || ruff.stderr || 'ruff format completed.';

      const black = spawnSync('black', ['.'], {
        cwd,
        encoding: 'utf-8',
        timeout: 60000,
      });
      if (black.status === 0) return black.stdout || black.stderr || 'black completed.';
    }

    return 'No formatter detected. Supported: Prettier, ESLint, cargo fmt, go fmt, ruff, black.';
  },
};
