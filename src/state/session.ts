import { appendFileSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { Message } from '../types.js';

export interface SessionRecord {
  timestamp: string;
  role: string;
  content: string;
  toolCalls?: string;
  toolCallId?: string;
}

export function getSessionDir(): string {
  const dir = join(homedir(), '.minagent', 'sessions');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function getTranscriptPath(): string {
  const now = new Date().toISOString().slice(0, 10);
  return join(getSessionDir(), `session-${now}.jsonl`);
}

export function recordMessage(message: Message): void {
  const record: SessionRecord = {
    timestamp: new Date().toISOString(),
    role: message.role,
    content: message.content,
    toolCalls: message.toolCalls ? JSON.stringify(message.toolCalls) : undefined,
    toolCallId: message.toolCallId,
  };

  const line = JSON.stringify(record) + '\n';
  appendFileSync(getTranscriptPath(), line, 'utf-8');
}

export function loadTranscript(path?: string): Message[] | null {
  const filePath = path || getTranscriptPath();
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());
    const messages: Message[] = [];

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as SessionRecord;
        const msg: Message = {
          role: record.role as Message['role'],
          content: record.content,
        };
        if (record.toolCalls) {
          msg.toolCalls = JSON.parse(record.toolCalls);
        }
        if (record.toolCallId) {
          msg.toolCallId = record.toolCallId;
        }
        messages.push(msg);
      } catch {
        // Skip malformed lines
      }
    }

    return messages;
  } catch {
    return null;
  }
}

export function saveSessionState(messages: Message[], metadata?: Record<string, unknown>): void {
  const sessionDir = getSessionDir();
  const statePath = join(sessionDir, 'last-state.json');
  const state = {
    timestamp: new Date().toISOString(),
    cwd: process.cwd(),
    messages,
    metadata,
  };
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

export function loadSessionState(): { messages: Message[]; metadata?: Record<string, unknown> } | null {
  const statePath = join(getSessionDir(), 'last-state.json');
  if (!existsSync(statePath)) return null;

  try {
    const state = JSON.parse(readFileSync(statePath, 'utf-8'));
    return { messages: state.messages || [], metadata: state.metadata };
  } catch {
    return null;
  }
}
