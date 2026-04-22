import { z } from 'zod';
import type { Tool } from './types.js';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

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
      const response = await fetchWithGuards(args.url);

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

const MAX_REDIRECTS = 3;
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
]);

async function fetchWithGuards(rawUrl: string): Promise<Response> {
  const initialUrl = new URL(rawUrl);
  await assertSafeTarget(initialUrl);

  let current = initialUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const response = await fetch(current.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MinAgent/0.1)',
      },
      redirect: 'manual',
    });

    if (!isRedirect(response.status)) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) {
      throw new Error(`Redirect without Location header from ${current.toString()}`);
    }
    if (i === MAX_REDIRECTS) {
      throw new Error(`Too many redirects (>${MAX_REDIRECTS})`);
    }

    current = new URL(location, current);
    await assertSafeTarget(current);
  }

  throw new Error('Unexpected redirect loop');
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

async function assertSafeTarget(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Blocked URL protocol: ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new Error('Blocked URL with embedded credentials');
  }

  const host = url.hostname.toLowerCase();
  if (!host) {
    throw new Error('Blocked URL with empty host');
  }
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.localhost') || host.endsWith('.local')) {
    throw new Error(`Blocked private hostname: ${host}`);
  }

  const family = isIP(host);
  if (family === 4 && isPrivateIPv4(host)) {
    throw new Error(`Blocked private IPv4 target: ${host}`);
  }
  if (family === 6 && isPrivateIPv6(host)) {
    throw new Error(`Blocked private IPv6 target: ${host}`);
  }

  if (family === 0) {
    const records = await lookup(host, { all: true, verbatim: true });
    if (records.length === 0) {
      throw new Error(`Blocked unresolved hostname: ${host}`);
    }
    for (const record of records) {
      if (
        (record.family === 4 && isPrivateIPv4(record.address)) ||
        (record.family === 6 && isPrivateIPv6(record.address))
      ) {
        throw new Error(`Blocked hostname resolving to private address: ${host}`);
      }
    }
  }
}

function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.');
  if (parts.length !== 4) {
    return true;
  }
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }

  const a = nums[0]!;
  const b = nums[1]!;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0] || '';
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA fc00::/7
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true; // link-local fe80::/10
  if (normalized.startsWith('ff')) return true; // multicast

  // IPv4-mapped IPv6 (::ffff:127.0.0.1, etc.)
  const mappedPrefix = '::ffff:';
  if (normalized.startsWith(mappedPrefix)) {
    const mapped = normalized.slice(mappedPrefix.length);
    if (isIP(mapped) === 4) {
      return isPrivateIPv4(mapped);
    }
  }

  return false;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
