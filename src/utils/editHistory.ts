import { readFileSync, writeFileSync, existsSync } from 'fs';

export interface EditRecord {
  filePath: string;
  originalContent: string;
  newContent: string;
  timestamp: string;
}

export class EditHistory {
  private stack: EditRecord[] = [];
  private redoStack: EditRecord[] = [];

  record(record: EditRecord): void {
    this.stack.push(record);
    this.redoStack = []; // Clear redo on new edit
  }

  canUndo(): boolean {
    return this.stack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): EditRecord | null {
    if (!this.canUndo()) return null;
    const record = this.stack.pop()!;
    try {
      writeFileSync(record.filePath, record.originalContent, 'utf-8');
      this.redoStack.push(record);
      return record;
    } catch {
      this.stack.push(record);
      return null;
    }
  }

  redo(): EditRecord | null {
    if (!this.canRedo()) return null;
    const record = this.redoStack.pop()!;
    try {
      writeFileSync(record.filePath, record.newContent, 'utf-8');
      this.stack.push(record);
      return record;
    } catch {
      this.redoStack.push(record);
      return null;
    }
  }

  getHistory(): string {
    return this.stack.map((r, i) =>
      `${i + 1}. ${r.filePath} (${r.timestamp.slice(0, 16)})`
    ).join('\n') || '(no edits yet)';
  }
}
