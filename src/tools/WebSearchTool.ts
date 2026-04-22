import { z } from 'zod';
import type { Tool } from './types.js';

export const WebSearchToolSchema = z.object({
  query: z.string().describe('Search query'),
  max_results: z.number().optional().describe('Maximum number of results (default: 5)'),
});

export const WebSearchTool: Tool<typeof WebSearchToolSchema> = {
  name: 'WebSearchTool',
  description: 'Search the web for information. Returns search results with titles and URLs.',
  schema: WebSearchToolSchema,
  async execute(args) {
    // Since we don't have a search API key, use DuckDuckGo HTML scraping
    // or instruct the user to set up a search API
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`;

    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MinAgent/0.1)',
        },
      });

      if (!response.ok) {
        return `Error: Search failed (${response.status})`;
      }

      const html = await response.text();

      // Extract results
      const results: { title: string; url: string; snippet: string }[] = [];
      const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g;
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/g;

      let match: RegExpExecArray | null;
      while ((match = resultRegex.exec(html)) !== null && results.length < (args.max_results || 5)) {
        const url = match[1] || '';
        const title = (match[2] || '').replace(/<[^>]+>/g, '').trim();
        if (url && title) {
          results.push({ title, url, snippet: '' });
        }
      }

      if (results.length === 0) {
        return 'No results found. Note: Web search requires internet access.';
      }

      return results.map((r, i) =>
        `${i + 1}. ${r.title}\n   ${r.url}`
      ).join('\n\n');
    } catch (err: any) {
      return `Error: ${err.message}\n\nTip: WebSearchTool requires internet access. For better results, configure a search API (e.g., SERP API).`;
    }
  },
};
