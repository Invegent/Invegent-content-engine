// mcp-github-bridge v1.0.0 — read-only GitHub MCP bridge for Claude custom connector.
//
// Plan: docs/briefs (build plan provided in chat) — phases 0/1 ship this file.
// Auth: single shared-secret header (X-MCP-Secret). v1 is read-only, so no
//       OAuth/DCR/PKCE machinery — header check is enough. Cleaner than
//       URL-embedded secrets if claude.ai's connector dialog accepts custom
//       headers (verified during Phase 3 of the plan).
//
// Endpoints:
//   GET  /     — health check (no auth) — returns server info + tool names + whitelist
//   POST /     — MCP JSON-RPC (requires X-MCP-Secret header)
//
// Methods (POST /):
//   initialize, notifications/initialized, tools/list, tools/call, ping
//
// Tools (read-only v1):
//   - get_file_contents(owner, repo, path, ref?)        — decoded UTF-8, ≤ 1 MB
//   - list_directory   (owner, repo, path?, ref?)       — array of {name, path, type, sha, size}
//   - list_recent_commits(owner, repo, path?, limit?)   — up to 30 commits with sha/message/author/date
//
// Repo whitelist: hardcoded, defence-in-depth on top of the read-only PAT scope.
//
// Errors: tool failures return MCP-shaped {content:[{type:'text', text:'...'}], isError:true}
//         rather than HTTP 500, so Claude can render them gracefully.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

// ============================================================================
// CONFIG
// ============================================================================

const MCP_SHARED_SECRET = Deno.env.get('MCP_SHARED_SECRET') ?? '';
const GITHUB_PAT = Deno.env.get('GITHUB_PAT') ?? '';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'mcp-github-bridge', version: '1.0.0' };

const MAX_FILE_BYTES = 1_000_000; // 1 MB hard cap on get_file_contents

const REPO_WHITELIST: ReadonlySet<string> = new Set([
  'Invegent/Invegent-content-engine',
  'Invegent/invegent-dashboard',
  'Invegent/invegent-portal'
]);

const GITHUB_API = 'https://api.github.com';

// ============================================================================
// CORS
// ============================================================================

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, mcp-session-id, mcp-protocol-version, x-mcp-secret'
};

function corsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string>) ?? {})
    }
  });
}

// ============================================================================
// PATH ROUTING
// ============================================================================

function relativePath(reqUrl: string): string {
  const u = new URL(reqUrl);
  const marker = '/mcp-github-bridge';
  const i = u.pathname.indexOf(marker);
  if (i === -1) return u.pathname;
  const rest = u.pathname.substring(i + marker.length);
  return rest === '' ? '/' : rest;
}

// ============================================================================
// AUTH (shared-secret header)
// ============================================================================

function authenticateMcpRequest(req: Request): boolean {
  if (!MCP_SHARED_SECRET) return false; // misconfigured → refuse all
  const got = req.headers.get('x-mcp-secret') ?? '';
  return got === MCP_SHARED_SECRET;
}

function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32000, message: 'Unauthorized' }
    }),
    { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
}

// ============================================================================
// GITHUB API HELPERS
// ============================================================================

interface GitHubError {
  status: number;
  message: string;
}

function repoAllowed(owner: string, repo: string): boolean {
  return REPO_WHITELIST.has(`${owner}/${repo}`);
}

function ghHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${GITHUB_PAT}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'mcp-github-bridge/1.0.0'
  };
}

async function ghFetch(pathAndQuery: string): Promise<unknown> {
  if (!GITHUB_PAT) {
    throw { status: 500, message: 'GITHUB_PAT not configured on the Edge Function' } as GitHubError;
  }
  const r = await fetch(`${GITHUB_API}${pathAndQuery}`, {
    method: 'GET',
    headers: ghHeaders()
  });
  if (!r.ok) {
    let body = '';
    try { body = await r.text(); } catch { /* ignore */ }
    throw {
      status: r.status,
      message: `GitHub ${r.status}: ${body.slice(0, 400)}`
    } as GitHubError;
  }
  return await r.json();
}

function decodeBase64Utf8(b64: string): string {
  // GitHub returns base64 with embedded newlines; strip before atob.
  const stripped = b64.replace(/\n/g, '');
  const bin = atob(stripped);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

// Encode a repo-relative path for the contents URL: each segment URL-encoded
// but `/` separators preserved. Defensive against leading/trailing slashes.
function encodeRepoPath(p: string): string {
  const trimmed = p.replace(/^\/+/, '').replace(/\/+$/, '');
  if (trimmed === '') return '';
  return trimmed.split('/').map(encodeURIComponent).join('/');
}

function ownerRepoUrlPart(owner: string, repo: string): string {
  return `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const TOOLS = [
  {
    name: 'get_file_contents',
    description:
      'Fetch a single file from a whitelisted Invegent GitHub repo. Returns decoded UTF-8 content with sha, path, and size. Refuses files larger than 1 MB.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub org/user. Must be Invegent.' },
        repo: { type: 'string', description: 'Repo name. Must be on the whitelist.' },
        path: { type: 'string', description: 'Repo-relative path to the file (no leading slash).' },
        ref: { type: 'string', description: 'Branch, tag, or commit SHA. Default main.' }
      },
      required: ['owner', 'repo', 'path']
    }
  },
  {
    name: 'list_directory',
    description:
      'List entries in a directory of a whitelisted Invegent GitHub repo. Returns an array of {name, path, type, sha, size}. Use empty path for repo root.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub org/user. Must be Invegent.' },
        repo: { type: 'string', description: 'Repo name. Must be on the whitelist.' },
        path: { type: 'string', description: 'Repo-relative directory path. Empty string = repo root.' },
        ref: { type: 'string', description: 'Branch, tag, or commit SHA. Default main.' }
      },
      required: ['owner', 'repo']
    }
  },
  {
    name: 'list_recent_commits',
    description:
      'List recent commits in a whitelisted Invegent GitHub repo, optionally filtered to a path. Returns up to limit (default 10, max 30) commits with sha/message/author/committed_at.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub org/user. Must be Invegent.' },
        repo: { type: 'string', description: 'Repo name. Must be on the whitelist.' },
        path: { type: 'string', description: 'Optional repo-relative path filter.' },
        limit: { type: 'integer', description: 'Max commits to return. Default 10. Max 30.' }
      },
      required: ['owner', 'repo']
    }
  }
];

// ============================================================================
// TOOL RESULT HELPERS (MCP tool-call envelope shape)
// ============================================================================

function toolError(message: string): { content: { type: string; text: string }[]; isError: true } {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function toolText(payload: unknown): { content: { type: string; text: string }[]; isError: false } {
  return {
    content: [{
      type: 'text',
      text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
    }],
    isError: false
  };
}

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

async function toolGetFileContents(args: any) {
  const owner = String(args?.owner ?? '');
  const repo = String(args?.repo ?? '');
  const path = String(args?.path ?? '');
  const ref = args?.ref != null && String(args.ref).length > 0 ? String(args.ref) : 'main';
  if (!owner || !repo || !path) {
    return toolError('owner, repo, and path are required');
  }
  if (!repoAllowed(owner, repo)) {
    return toolError(`Repo ${owner}/${repo} is not on the whitelist. Allowed: ${[...REPO_WHITELIST].join(', ')}`);
  }
  const encodedPath = encodeRepoPath(path);
  if (encodedPath === '') {
    return toolError('path must reference a file (cannot be empty or root).');
  }
  try {
    const url = `/repos/${ownerRepoUrlPart(owner, repo)}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`;
    const data = await ghFetch(url) as any;
    if (Array.isArray(data)) {
      return toolError(`Path ${path} is a directory, not a file. Use list_directory instead.`);
    }
    if (data?.type !== 'file') {
      return toolError(`Path ${path} is not a regular file (type=${data?.type ?? 'unknown'}).`);
    }
    const size = Number(data?.size ?? 0);
    if (size > MAX_FILE_BYTES) {
      return toolError(`File ${path} is ${size} bytes; cap is ${MAX_FILE_BYTES} bytes (1 MB). Refusing to fetch.`);
    }
    const encoding = String(data?.encoding ?? 'base64');
    let contentText: string;
    if (encoding === 'base64') {
      contentText = decodeBase64Utf8(String(data?.content ?? ''));
    } else if (encoding === 'utf-8' || encoding === '') {
      contentText = String(data?.content ?? '');
    } else {
      return toolError(`Unsupported file encoding from GitHub: ${encoding}`);
    }
    return toolText({
      owner,
      repo,
      path: data?.path ?? path,
      ref,
      sha: data?.sha ?? null,
      size,
      encoding: 'utf-8',
      content: contentText
    });
  } catch (e) {
    const err = e as GitHubError;
    return toolError(`get_file_contents failed: ${err?.message ?? String(e)}`);
  }
}

async function toolListDirectory(args: any) {
  const owner = String(args?.owner ?? '');
  const repo = String(args?.repo ?? '');
  const path = args?.path != null ? String(args.path) : '';
  const ref = args?.ref != null && String(args.ref).length > 0 ? String(args.ref) : 'main';
  if (!owner || !repo) {
    return toolError('owner and repo are required');
  }
  if (!repoAllowed(owner, repo)) {
    return toolError(`Repo ${owner}/${repo} is not on the whitelist. Allowed: ${[...REPO_WHITELIST].join(', ')}`);
  }
  try {
    const encodedPath = encodeRepoPath(path);
    const baseUrl = `/repos/${ownerRepoUrlPart(owner, repo)}/contents`;
    const url = encodedPath === ''
      ? `${baseUrl}?ref=${encodeURIComponent(ref)}`
      : `${baseUrl}/${encodedPath}?ref=${encodeURIComponent(ref)}`;
    const data = await ghFetch(url) as any;
    if (!Array.isArray(data)) {
      return toolError(`Path ${path || '/'} is not a directory (type=${data?.type ?? 'unknown'}). Use get_file_contents instead.`);
    }
    const entries = data.map((entry: any) => ({
      name: entry?.name ?? null,
      path: entry?.path ?? null,
      type: entry?.type ?? null,
      sha: entry?.sha ?? null,
      size: entry?.size ?? null
    }));
    return toolText({
      owner,
      repo,
      path: path || '',
      ref,
      count: entries.length,
      entries
    });
  } catch (e) {
    const err = e as GitHubError;
    return toolError(`list_directory failed: ${err?.message ?? String(e)}`);
  }
}

async function toolListRecentCommits(args: any) {
  const owner = String(args?.owner ?? '');
  const repo = String(args?.repo ?? '');
  const pathArg = args?.path != null ? String(args.path) : '';
  let limit = Number(args?.limit ?? 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 10;
  if (limit > 30) limit = 30;
  if (!owner || !repo) {
    return toolError('owner and repo are required');
  }
  if (!repoAllowed(owner, repo)) {
    return toolError(`Repo ${owner}/${repo} is not on the whitelist. Allowed: ${[...REPO_WHITELIST].join(', ')}`);
  }
  try {
    const qs = new URLSearchParams();
    qs.set('per_page', String(limit));
    if (pathArg) {
      const trimmed = pathArg.replace(/^\/+/, '').replace(/\/+$/, '');
      if (trimmed) qs.set('path', trimmed);
    }
    const url = `/repos/${ownerRepoUrlPart(owner, repo)}/commits?${qs.toString()}`;
    const data = await ghFetch(url);
    const commits = (Array.isArray(data) ? data : []).map((c: any) => ({
      sha: c?.sha ?? null,
      message: c?.commit?.message ?? null,
      author: c?.commit?.author?.name ?? null,
      author_email: c?.commit?.author?.email ?? null,
      committed_at: c?.commit?.author?.date ?? c?.commit?.committer?.date ?? null,
      html_url: c?.html_url ?? null
    }));
    return toolText({
      owner,
      repo,
      path: pathArg || null,
      limit,
      count: commits.length,
      commits
    });
  } catch (e) {
    const err = e as GitHubError;
    return toolError(`list_recent_commits failed: ${err?.message ?? String(e)}`);
  }
}

// ============================================================================
// MCP RPC HANDLER
// ============================================================================

async function handleRpc(msg: any): Promise<any | null> {
  const id = msg?.id ?? null;
  const method = msg?.method;
  const params = msg?.params;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO
      }
    };
  }
  if (method === 'notifications/initialized') return null;
  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  }
  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments ?? {};
    let result;
    try {
      if (name === 'get_file_contents')        result = await toolGetFileContents(args);
      else if (name === 'list_directory')      result = await toolListDirectory(args);
      else if (name === 'list_recent_commits') result = await toolListRecentCommits(args);
      else {
        return { jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${name}` } };
      }
    } catch (e) {
      result = { content: [{ type: 'text', text: `Tool execution error: ${String(e)}` }], isError: true };
    }
    return { jsonrpc: '2.0', id, result };
  }
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

async function handleMcpPost(req: Request): Promise<Response> {
  if (!authenticateMcpRequest(req)) return unauthorizedResponse();

  let msg: any;
  try { msg = await req.json(); }
  catch (e) {
    return jsonResponse(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: `Parse error: ${String(e)}` } },
      { status: 400 }
    );
  }

  const response = await handleRpc(msg);
  if (response === null) return new Response(null, { status: 202, headers: CORS_HEADERS });
  return jsonResponse(response);
}

// ============================================================================
// MAIN ROUTER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const path = relativePath(req.url);

  if (req.method === 'GET' && (path === '/' || path === '')) {
    return jsonResponse({
      ok: true,
      server: SERVER_INFO,
      tools: TOOLS.map((t) => t.name),
      whitelist: [...REPO_WHITELIST],
      auth: 'X-MCP-Secret header required on POST /'
    });
  }

  if (req.method === 'POST' && (path === '/' || path === '')) {
    return await handleMcpPost(req);
  }

  return new Response('Not found', { status: 404, headers: CORS_HEADERS });
});
