import { z } from 'zod';
import type { Tool } from './types.js';

export const WebFetchToolSchema = z.object({
  url: z.string().describe('URL to fetch'),
  max_length: z.number().optional().describe('Maximum content length in characters (default: 8000)'),
});

export const WebFetchTool: Tool<typeof WebFetchToolSchema> = {
  name: 'WebFetchTool',
  description: 'Fetch and read the content of a web page. Returns the text content.',
  schema: WebFetchToolSchema,
  async execute(args) {
    try {
      const response = await fetch(args.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MinAgent/0.1)',
        },
      });

      if (!response.ok) {
        return `Error: HTTP ${response.status} ${response.statusText}`;
      }

      const contentType = response.headers.get('content-type') || '';
      let text: string;

      if (contentType.includes('application/json')) {
        const json = await response.json();
        text = JSON.stringify(json, null, 2);
      } else {
        text = await response.text();
      }

      // Basic HTML stripping
      if (contentType.includes('text/html')) {
        text = stripHtml(text);
      }

      const maxLen = args.max_length || 8000;
      if (text.length > maxLen) {
        text = text.slice(0, maxLen) + `\n... [truncated, ${text.length - maxLen} chars hidden]`;
      }

      return text;
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
