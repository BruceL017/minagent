import { readFileSync, statSync } from 'fs';

export interface ContextFile {
  path: string;
  content: string;
  description?: string;
  mtime?: number;
}

export class ContextManager {
  private files = new Map<string, ContextFile>();

  add(file: ContextFile): void {
    this.files.set(file.path, file);
  }

  remove(path: string): boolean {
    return this.files.delete(path);
  }

  list(): ContextFile[] {
    return Array.from(this.files.values());
  }

  has(path: string): boolean {
    return this.files.has(path);
  }

  clear(): void {
    this.files.clear();
  }

  /** Refresh files that have been modified externally. Returns list of refreshed paths. */
  refreshChangedFiles(): string[] {
    const refreshed: string[] = [];
    for (const [path, file] of this.files) {
      try {
        const resolved = require('path').resolve(process.cwd(), path);
        const stats = statSync(resolved);
        if (!file.mtime || stats.mtimeMs > file.mtime) {
          const newContent = readFileSync(resolved, 'utf-8');
          this.files.set(path, {
            ...file,
            content: newContent,
            mtime: stats.mtimeMs,
          });
          refreshed.push(path);
        }
      } catch {
        // File may have been deleted; leave as-is
      }
    }
    return refreshed;
  }

  getContextPrompt(): string {
    if (this.files.size === 0) return '';

    const lines: string[] = ['\n--- Context Files ---'];
    for (const file of this.files.values()) {
      lines.push(`\nFile: ${file.path}${file.description ? ` (${file.description})` : ''}`);
      lines.push(file.content.slice(0, 5000));
      if (file.content.length > 5000) {
        lines.push(`... [${file.content.length - 5000} more chars]`);
      }
    }
    lines.push('--- End Context Files ---\n');
    return lines.join('\n');
  }
}
