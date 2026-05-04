// mcp-github-bridge v2.0.0 — read-only GitHub MCP bridge with OAuth 2.1 + DCR + PKCE
//                              for claude.ai custom connector.
//
// v1.0.0 was bearer-only (X-MCP-Secret header). claude.ai's custom connector UI
// does NOT support custom headers or pasted bearer tokens — it requires a full
// OAuth 2.1 dance with Dynamic Client Registration. v2 adds the OAuth half.
//
// Mirrors the OAuth structure of mcp-chatgpt-bridge v1.2.2. Reuses the same
// m.mcp_oauth_client + m.mcp_oauth_code tables (multi-tenant by client_id).
//
// Endpoints:
//   GET  /                                          — health check (no auth)
//   POST /                                          — MCP JSON-RPC (X-MCP-Secret OR JWT)
//   GET  /.well-known/oauth-authorization-server    — RFC 8414 metadata
//   GET  /.well-known/oauth-protected-resource      — RFC 9728 metadata
//   POST /register                                  — RFC 7591 Dynamic Client Registration
//   GET  /authorize                                 — 302 to dashboard.invegent.com/mcp-github-consent
//   POST /authorize                                 — consent form submission (validates passphrase)
//   POST /token                                     — OAuth 2.1 token endpoint (code or refresh)
//
// Auth on POST / accepts EITHER:
//   - Static via X-MCP-Secret header (curl/PowerShell smoke tests, internal use)
//   - JWT bearer in Authorization: Bearer eyJ... (issued by /token after OAuth flow)
//
// Tools (read-only v1, unchanged from v1.0.0):
//   - get_file_contents(owner, repo, path, ref?)
//   - list_directory   (owner, repo, path?, ref?)
//   - list_recent_commits(owner, repo, path?, limit?)
//
// Repo whitelist: hardcoded, defence-in-depth on top of the read-only PAT scope.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encodeHex } from 'https://deno.land/std@0.224.0/encoding/hex.ts';

// ============================================================================
// CONFIG
// ============================================================================

const MCP_SHARED_SECRET = Deno.env.get('MCP_SHARED_SECRET') ?? '';
const GITHUB_PAT = Deno.env.get('GITHUB_PAT') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BRIDGE_BASE_URL = `${SUPABASE_URL}/functions/v1/mcp-github-bridge`;
const CONSENT_PAGE_URL = 'https://dashboard.invegent.com/mcp-github-consent';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'mcp-github-bridge', version: '2.0.0' };

const MAX_FILE_BYTES = 1_000_000; // 1 MB hard cap on get_file_contents

const REPO_WHITELIST: ReadonlySet<string> = new Set([
  'Invegent/Invegent-content-engine',
  'Invegent/invegent-dashboard',
  'Invegent/invegent-portal'
]);

const GITHUB_API = 'https://api.github.com';

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;   // 30 days
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90;  // 90 days
const AUTH_CODE_TTL_SECONDS = 60 * 10;                // 10 min

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

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
// CRYPTO HELPERS
// ============================================================================

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return encodeHex(new Uint8Array(buf));
}

async function sha256Bytes(s: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(s);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return encodeHex(arr);
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getJwtKey(): Promise<CryptoKey> {
  // JWT signing key derived from MCP_SHARED_SECRET. Same secret rotation
  // invalidates all live tokens — desired behaviour.
  const seed = await sha256Bytes(MCP_SHARED_SECRET + ':oauth-jwt-v1');
  return await crypto.subtle.importKey(
    'raw', seed, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

async function jwtSign(payload: Record<string, unknown>): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await getJwtKey();
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64UrlEncode(new Uint8Array(sigBuf))}`;
}

async function jwtVerify(token: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const key = await getJwtKey();
  const valid = await crypto.subtle.verify(
    'HMAC', key, base64UrlDecode(sigB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );
  if (!valid) return null;
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
  } catch { return null; }
  const exp = payload.exp as number | undefined;
  if (typeof exp === 'number' && Date.now() / 1000 > exp) return null;
  return payload;
}

async function pkceVerify(verifier: string, challenge: string, method: string): Promise<boolean> {
  if (method === 'plain') return verifier === challenge;
  if (method === 'S256') {
    const hashed = await sha256Bytes(verifier);
    return base64UrlEncode(hashed) === challenge;
  }
  return false;
}

// ============================================================================
// CONSENT REDIRECT
// ============================================================================

function redirectToConsent(params: Record<string, string>, error?: string): Response {
  const url = new URL(CONSENT_PAGE_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && k !== 'passphrase' && k !== 'error') {
      url.searchParams.set(k, String(v));
    }
  }
  if (error) url.searchParams.set('error', error);
  return new Response(null, {
    status: 302,
    headers: { ...CORS_HEADERS, 'Location': url.toString() }
  });
}

// ============================================================================
// OAUTH METADATA
// ============================================================================

function handleAuthServerMetadata(): Response {
  return jsonResponse({
    issuer: BRIDGE_BASE_URL,
    authorization_endpoint: `${BRIDGE_BASE_URL}/authorize`,
    token_endpoint: `${BRIDGE_BASE_URL}/token`,
    registration_endpoint: `${BRIDGE_BASE_URL}/register`,
    scopes_supported: ['mcp'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256', 'plain'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic']
  });
}

function handleResourceMetadata(): Response {
  return jsonResponse({
    resource: BRIDGE_BASE_URL,
    authorization_servers: [BRIDGE_BASE_URL],
    scopes_supported: ['mcp'],
    bearer_methods_supported: ['header']
  });
}

// ============================================================================
// DYNAMIC CLIENT REGISTRATION (RFC 7591)
// ============================================================================

async function handleRegister(req: Request): Promise<Response> {
  let body: any;
  try { body = await req.json(); }
  catch { return jsonResponse({ error: 'invalid_client_metadata' }, { status: 400 }); }

  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (redirectUris.length === 0) {
    return jsonResponse({ error: 'invalid_redirect_uri', error_description: 'redirect_uris required' }, { status: 400 });
  }

  const tokenAuthMethod = body.token_endpoint_auth_method ?? 'none';
  if (!['none', 'client_secret_post', 'client_secret_basic'].includes(tokenAuthMethod)) {
    return jsonResponse({ error: 'invalid_client_metadata' }, { status: 400 });
  }

  const clientId = `mcp_gh_${randomToken(16)}`;
  const clientSecret = tokenAuthMethod === 'none' ? null : randomToken(32);

  const { error } = await supabase.schema('m').from('mcp_oauth_client').insert({
    client_id: clientId,
    client_secret: clientSecret,
    client_name: body.client_name ?? null,
    redirect_uris: redirectUris,
    grant_types: body.grant_types ?? ['authorization_code', 'refresh_token'],
    response_types: body.response_types ?? ['code'],
    token_endpoint_auth_method: tokenAuthMethod,
    scope: body.scope ?? 'mcp',
    metadata: body
  });

  if (error) {
    return jsonResponse({ error: 'server_error', error_description: error.message }, { status: 500 });
  }

  const response: Record<string, unknown> = {
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: redirectUris,
    grant_types: body.grant_types ?? ['authorization_code', 'refresh_token'],
    response_types: body.response_types ?? ['code'],
    token_endpoint_auth_method: tokenAuthMethod,
    client_name: body.client_name ?? undefined,
    scope: body.scope ?? 'mcp'
  };
  if (clientSecret) {
    response.client_secret = clientSecret;
    response.client_secret_expires_at = 0;
  }
  return jsonResponse(response, { status: 201 });
}

// ============================================================================
// AUTHORIZE ENDPOINT
// ============================================================================

async function handleAuthorizeGet(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const params = Object.fromEntries(u.searchParams.entries());

  if (params.response_type !== 'code') {
    return redirectToConsent(params, 'invalid_request');
  }
  if (!params.client_id || !params.redirect_uri || !params.code_challenge) {
    return redirectToConsent(params, 'invalid_request');
  }

  const { data: client } = await supabase
    .schema('m').from('mcp_oauth_client')
    .select('client_id, redirect_uris')
    .eq('client_id', params.client_id)
    .maybeSingle();

  if (!client) {
    return redirectToConsent(params, 'invalid_client');
  }
  if (!(client.redirect_uris as string[]).includes(params.redirect_uri)) {
    return redirectToConsent(params, 'invalid_redirect_uri');
  }

  return redirectToConsent(params);
}

async function handleAuthorizePost(req: Request): Promise<Response> {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => { params[k] = String(v); });

  const passphrase = params.passphrase ?? '';
  if (passphrase !== MCP_SHARED_SECRET) {
    return redirectToConsent(params, 'bad_passphrase');
  }

  const { data: client } = await supabase
    .schema('m').from('mcp_oauth_client')
    .select('client_id, redirect_uris')
    .eq('client_id', params.client_id)
    .maybeSingle();

  if (!client || !(client.redirect_uris as string[]).includes(params.redirect_uri)) {
    return redirectToConsent(params, 'invalid_client');
  }

  const code = randomToken(24);
  const expires_at = new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000).toISOString();

  const { error: insertErr } = await supabase
    .schema('m').from('mcp_oauth_code').insert({
      code,
      client_id: params.client_id,
      redirect_uri: params.redirect_uri,
      code_challenge: params.code_challenge,
      code_challenge_method: params.code_challenge_method || 'S256',
      scope: params.scope || 'mcp',
      expires_at
    });

  if (insertErr) {
    return redirectToConsent(params, 'server_error');
  }

  const redirectUrl = new URL(params.redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (params.state) redirectUrl.searchParams.set('state', params.state);

  return new Response(null, {
    status: 302,
    headers: { 'Location': redirectUrl.toString(), ...CORS_HEADERS }
  });
}

// ============================================================================
// TOKEN ENDPOINT
// ============================================================================

async function handleToken(req: Request): Promise<Response> {
  const contentType = req.headers.get('content-type') ?? '';
  let params: Record<string, string> = {};

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text();
    new URLSearchParams(text).forEach((v, k) => { params[k] = v; });
  } else if (contentType.includes('application/json')) {
    try { params = await req.json(); } catch { /* fall through */ }
  } else {
    try {
      const text = await req.text();
      try { params = JSON.parse(text); }
      catch { new URLSearchParams(text).forEach((v, k) => { params[k] = v; }); }
    } catch { /* nothing */ }
  }

  let clientId = params.client_id ?? '';
  let clientSecret = params.client_secret ?? '';
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice('Basic '.length));
      const [u, p] = decoded.split(':', 2);
      if (!clientId) clientId = decodeURIComponent(u);
      if (!clientSecret) clientSecret = decodeURIComponent(p);
    } catch { /* ignore */ }
  }

  if (!clientId) {
    return jsonResponse({ error: 'invalid_client' }, { status: 401 });
  }

  const { data: client } = await supabase
    .schema('m').from('mcp_oauth_client')
    .select('client_id, client_secret, token_endpoint_auth_method')
    .eq('client_id', clientId)
    .maybeSingle();

  if (!client) {
    return jsonResponse({ error: 'invalid_client' }, { status: 401 });
  }

  if (client.token_endpoint_auth_method !== 'none') {
    if (!clientSecret || clientSecret !== client.client_secret) {
      return jsonResponse({ error: 'invalid_client' }, { status: 401 });
    }
  }

  const grantType = params.grant_type;

  if (grantType === 'authorization_code') {
    return await handleTokenAuthCode(params, clientId);
  } else if (grantType === 'refresh_token') {
    return await handleTokenRefresh(params, clientId);
  }

  return jsonResponse({ error: 'unsupported_grant_type' }, { status: 400 });
}

async function handleTokenAuthCode(params: Record<string, string>, clientId: string): Promise<Response> {
  const code = params.code;
  const codeVerifier = params.code_verifier;
  const redirectUri = params.redirect_uri;

  if (!code || !codeVerifier || !redirectUri) {
    return jsonResponse({ error: 'invalid_request', error_description: 'code, code_verifier, redirect_uri required' }, { status: 400 });
  }

  const { data: codeRow } = await supabase
    .schema('m').from('mcp_oauth_code')
    .select('code, client_id, redirect_uri, code_challenge, code_challenge_method, expires_at, used_at, scope')
    .eq('code', code)
    .maybeSingle();

  if (!codeRow) {
    return jsonResponse({ error: 'invalid_grant', error_description: 'unknown code' }, { status: 400 });
  }
  if (codeRow.client_id !== clientId) {
    return jsonResponse({ error: 'invalid_grant', error_description: 'client_id mismatch' }, { status: 400 });
  }
  if (codeRow.redirect_uri !== redirectUri) {
    return jsonResponse({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' }, { status: 400 });
  }
  if (codeRow.used_at) {
    return jsonResponse({ error: 'invalid_grant', error_description: 'code already used' }, { status: 400 });
  }
  if (new Date(codeRow.expires_at as string).getTime() < Date.now()) {
    return jsonResponse({ error: 'invalid_grant', error_description: 'code expired' }, { status: 400 });
  }

  const pkceOk = await pkceVerify(
    codeVerifier,
    codeRow.code_challenge as string,
    codeRow.code_challenge_method as string
  );
  if (!pkceOk) {
    return jsonResponse({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, { status: 400 });
  }

  await supabase
    .schema('m').from('mcp_oauth_code')
    .update({ used_at: new Date().toISOString() })
    .eq('code', code);

  await supabase
    .schema('m').from('mcp_oauth_client')
    .update({ last_used_at: new Date().toISOString() })
    .eq('client_id', clientId);

  return await issueTokens(clientId, codeRow.scope as string ?? 'mcp');
}

async function handleTokenRefresh(params: Record<string, string>, clientId: string): Promise<Response> {
  const refreshToken = params.refresh_token;
  if (!refreshToken) {
    return jsonResponse({ error: 'invalid_request', error_description: 'refresh_token required' }, { status: 400 });
  }

  const payload = await jwtVerify(refreshToken);
  if (!payload || payload.token_type !== 'refresh' || payload.client_id !== clientId) {
    return jsonResponse({ error: 'invalid_grant', error_description: 'invalid refresh token' }, { status: 400 });
  }

  return await issueTokens(clientId, (payload.scope as string) ?? 'mcp');
}

async function issueTokens(clientId: string, scope: string): Promise<Response> {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = await jwtSign({
    iss: BRIDGE_BASE_URL,
    sub: clientId,
    aud: BRIDGE_BASE_URL,
    client_id: clientId,
    scope,
    token_type: 'access',
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS
  });
  const refreshToken = await jwtSign({
    iss: BRIDGE_BASE_URL,
    sub: clientId,
    aud: BRIDGE_BASE_URL,
    client_id: clientId,
    scope,
    token_type: 'refresh',
    iat: now,
    exp: now + REFRESH_TOKEN_TTL_SECONDS
  });

  return jsonResponse({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope
  });
}

// ============================================================================
// AUTH CHECK FOR MCP ENDPOINT
// ============================================================================

async function authenticateMcpRequest(req: Request): Promise<{ ok: true; via: 'static' | 'jwt'; client_id?: string } | { ok: false }> {
  const secretHeader = req.headers.get('x-mcp-secret') ?? '';
  if (MCP_SHARED_SECRET && secretHeader === MCP_SHARED_SECRET) {
    return { ok: true, via: 'static' };
  }

  const auth = req.headers.get('authorization') ?? '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim();

    if (MCP_SHARED_SECRET && token === MCP_SHARED_SECRET) {
      return { ok: true, via: 'static' };
    }

    if (token.split('.').length === 3) {
      const payload = await jwtVerify(token);
      if (payload && payload.token_type === 'access') {
        return { ok: true, via: 'jwt', client_id: payload.client_id as string };
      }
    }
  }

  return { ok: false };
}

function unauthorizedResponse(): Response {
  const wwwAuth = `Bearer resource_metadata="${BRIDGE_BASE_URL}/.well-known/oauth-protected-resource"`;
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Unauthorized' } }),
    {
      status: 401,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'WWW-Authenticate': wwwAuth
      }
    }
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
    'User-Agent': 'mcp-github-bridge/2.0.0'
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
  const stripped = b64.replace(/\n/g, '');
  const bin = atob(stripped);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

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
  const authResult = await authenticateMcpRequest(req);
  if (!authResult.ok) return unauthorizedResponse();

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

  if (req.method === 'GET' && (path === '/.well-known/oauth-authorization-server' || path === '/.well-known/openid-configuration')) {
    return handleAuthServerMetadata();
  }
  if (req.method === 'GET' && path === '/.well-known/oauth-protected-resource') {
    return handleResourceMetadata();
  }

  if (req.method === 'POST' && path === '/register')  return await handleRegister(req);
  if (req.method === 'GET'  && path === '/authorize') return await handleAuthorizeGet(req);
  if (req.method === 'POST' && path === '/authorize') return await handleAuthorizePost(req);
  if (req.method === 'POST' && path === '/token')     return await handleToken(req);

  if (req.method === 'GET' && (path === '/' || path === '')) {
    return jsonResponse({
      ok: true,
      server: SERVER_INFO,
      tools: TOOLS.map((t) => t.name),
      whitelist: [...REPO_WHITELIST],
      auth: 'OAuth 2.1 + DCR + PKCE for claude.ai; X-MCP-Secret or Bearer for internal',
      oauth_metadata: `${BRIDGE_BASE_URL}/.well-known/oauth-authorization-server`
    });
  }

  if (req.method === 'POST' && (path === '/' || path === '')) {
    return await handleMcpPost(req);
  }

  return new Response('Not found', { status: 404, headers: CORS_HEADERS });
});
