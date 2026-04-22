import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { getSessionDir } from '../state/session.js';
import type { Command } from './types.js';

export const sessionsCommand: Command = {
  name: 'sessions',
  description: 'List recent session transcripts',
  execute: async () => {
    const dir = getSessionDir();
    try {
      const files = readdirSync(dir)
        .filter((f) => f.endsWith('.jsonl'))
        .map((f) => {
          const path = join(dir, f);
          const stats = statSync(path);
          return { name: f, path, mtime: stats.mtime };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
        .slice(0, 10);

      if (files.length === 0) return 'No session transcripts found.';

      const lines = ['Recent sessions:'];
      for (const f of files) {
        let count = 0;
        try {
          const content = readFileSync(f.path, 'utf-8');
          count = content.split('\n').filter((l) => l.trim()).length;
        } catch {
          // ignore
        }
        lines.push(`  ${f.name} — ${count} messages (${f.mtime.toISOString().slice(0, 16)})`);
      }
      return lines.join('\n');
    } catch {
      return 'No session transcripts found.';
    }
  },
};
