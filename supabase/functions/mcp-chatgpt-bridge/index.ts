// mcp-chatgpt-bridge v1.2.1 — OAuth 2.1 + DCR + PKCE wrapper around the existing MCP server.
//
// v1.2.1 patch: renderConsentPage uses Headers API explicitly instead of object-literal
// headers. The object-literal pattern in Deno's Response constructor was apparently
// not propagating Content-Type for HTML responses through the Supabase EF gateway,
// causing the consent page to render as plain text in browsers.
//
// Endpoints:
//   GET  /                                                  — health check
//   POST /                                                  — MCP JSON-RPC (requires bearer or JWT)
//   GET  /.well-known/oauth-authorization-server            — RFC 8414 metadata
//   GET  /.well-known/oauth-protected-resource              — RFC 9728 metadata
//   POST /register                                          — RFC 7591 Dynamic Client Registration
//   GET  /authorize                                         — OAuth 2.1 auth endpoint (consent form)
//   POST /authorize                                         — consent form submission
//   POST /token                                             — OAuth 2.1 token endpoint (code or refresh)
//
// Auth on the MCP endpoint accepts EITHER:
//   - Static bearer: Bearer <MCP_BRIDGE_BEARER_TOKEN>          (for PowerShell/internal/admin)
//   - JWT bearer:    Bearer eyJ...                             (issued by /token after OAuth flow)
//
// The OAuth flow's consent step requires entering MCP_BRIDGE_BEARER_TOKEN as a passphrase.
// This is the only human gate — once consent succeeds, claude.ai gets a 30-day JWT.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encodeHex } from 'https://deno.land/std@0.224.0/encoding/hex.ts';

// ============================================================================
// CONFIG
// ============================================================================

const BRIDGE_TOKEN = Deno.env.get('MCP_BRIDGE_BEARER_TOKEN')!;
const INTERNAL_TOKEN = Deno.env.get('INTERNAL_WORKER_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WORKER_URL = `${SUPABASE_URL}/functions/v1/chatgpt-review-worker`;
const BRIDGE_BASE_URL = `${SUPABASE_URL}/functions/v1/mcp-chatgpt-bridge`;
const MAX_CONTEXT_BYTES = 50_000;
const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'mcp-chatgpt-bridge', version: '1.2.1' };

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;   // 30 days
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90;  // 90 days
const AUTH_CODE_TTL_SECONDS = 60 * 10;                // 10 min

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ============================================================================
// PATH ROUTING
// ============================================================================

function relativePath(reqUrl: string): string {
  const u = new URL(reqUrl);
  const marker = '/mcp-chatgpt-bridge';
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
  // Derive JWT signing key deterministically from the bridge bearer token + a label.
  // Rotating MCP_BRIDGE_BEARER_TOKEN automatically invalidates all OAuth-issued JWTs.
  const seed = await sha256Bytes(BRIDGE_TOKEN + ':oauth-jwt-v1');
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
// CORS
// ============================================================================

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version'
};

function corsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', ...(init.headers as Record<string,string> ?? {}) }
  });
}

function htmlResponse(html: string, status = 200): Response {
  // Use Headers API explicitly — object-literal headers were not propagating
  // Content-Type for HTML responses through the Supabase EF gateway in v1.2.0.
  const headers = new Headers();
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(html, { status, headers });
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

  const clientId = `mcp_${randomToken(16)}`;
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
    response.client_secret_expires_at = 0; // never
  }
  return jsonResponse(response, { status: 201 });
}

// ============================================================================
// AUTHORIZE ENDPOINT (CONSENT)
// ============================================================================

function renderConsentPage(params: Record<string, string>, errorMsg?: string): Response {
  const safeParams = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, String(v).replace(/[<>"'&]/g, c =>
      ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' } as any)[c]
    )])
  );

  const errorBlock = errorMsg
    ? `<div style="color:#c00;background:#fee;padding:8px 12px;border-radius:4px;margin-bottom:12px;">${errorMsg.replace(/[<>]/g, '')}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Authorize ChatGPT Review</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 440px; margin: 60px auto; padding: 0 20px; color: #222; }
  h1 { font-size: 22px; margin-bottom: 8px; }
  p { color: #555; line-height: 1.5; }
  .card { border: 1px solid #ddd; border-radius: 8px; padding: 24px; }
  label { display: block; font-weight: 500; margin: 16px 0 6px; }
  input[type=password] { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
  button { background: #111; color: #fff; border: none; padding: 12px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-top: 16px; width: 100%; }
  button:hover { background: #333; }
  .meta { font-size: 12px; color: #888; margin-top: 16px; word-break: break-all; }
</style>
</head>
<body>
<div class="card">
<h1>Authorize ChatGPT Review</h1>
<p><strong>${safeParams.client_id || 'A client'}</strong> is requesting access to call the cross-check MCP on your behalf.</p>
${errorBlock}
<form method="POST">
  <input type="hidden" name="client_id" value="${safeParams.client_id || ''}">
  <input type="hidden" name="redirect_uri" value="${safeParams.redirect_uri || ''}">
  <input type="hidden" name="state" value="${safeParams.state || ''}">
  <input type="hidden" name="code_challenge" value="${safeParams.code_challenge || ''}">
  <input type="hidden" name="code_challenge_method" value="${safeParams.code_challenge_method || 'S256'}">
  <input type="hidden" name="scope" value="${safeParams.scope || 'mcp'}">
  <input type="hidden" name="response_type" value="${safeParams.response_type || 'code'}">
  <label for="passphrase">Bridge passphrase</label>
  <input type="password" id="passphrase" name="passphrase" autocomplete="off" autofocus required>
  <button type="submit">Authorize</button>
</form>
<div class="meta">Granting access issues a 30-day token to this client. Revoke by rotating MCP_BRIDGE_BEARER_TOKEN.</div>
</div>
</body>
</html>`;
  return htmlResponse(html);
}

async function handleAuthorizeGet(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const params = Object.fromEntries(u.searchParams.entries());

  if (params.response_type !== 'code') {
    return jsonResponse({ error: 'unsupported_response_type' }, { status: 400 });
  }
  if (!params.client_id || !params.redirect_uri || !params.code_challenge) {
    return jsonResponse({ error: 'invalid_request', error_description: 'client_id, redirect_uri, code_challenge required' }, { status: 400 });
  }

  // Validate client + redirect_uri
  const { data: client } = await supabase
    .schema('m').from('mcp_oauth_client')
    .select('client_id, redirect_uris')
    .eq('client_id', params.client_id)
    .maybeSingle();

  if (!client) {
    return jsonResponse({ error: 'invalid_client' }, { status: 400 });
  }
  if (!(client.redirect_uris as string[]).includes(params.redirect_uri)) {
    return jsonResponse({ error: 'invalid_redirect_uri' }, { status: 400 });
  }

  return renderConsentPage(params);
}

async function handleAuthorizePost(req: Request): Promise<Response> {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => { params[k] = String(v); });

  const passphrase = params.passphrase ?? '';
  if (passphrase !== BRIDGE_TOKEN) {
    return renderConsentPage(params, 'Incorrect passphrase. Try again.');
  }

  // Validate client again
  const { data: client } = await supabase
    .schema('m').from('mcp_oauth_client')
    .select('client_id, redirect_uris')
    .eq('client_id', params.client_id)
    .maybeSingle();

  if (!client || !(client.redirect_uris as string[]).includes(params.redirect_uri)) {
    return jsonResponse({ error: 'invalid_client_or_redirect' }, { status: 400 });
  }

  // Issue auth code
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
    return jsonResponse({ error: 'server_error', error_description: insertErr.message }, { status: 500 });
  }

  // 302 redirect back to client
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
    // Some clients omit/malformed content-type; try both
    try {
      const text = await req.text();
      try { params = JSON.parse(text); }
      catch { new URLSearchParams(text).forEach((v, k) => { params[k] = v; }); }
    } catch { /* nothing */ }
  }

  // Client credentials may be in body or in Basic auth header
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

  // Look up client
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
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return { ok: false };
  const token = auth.slice('Bearer '.length).trim();

  if (token === BRIDGE_TOKEN) return { ok: true, via: 'static' };

  if (token.split('.').length === 3) {
    const payload = await jwtVerify(token);
    if (payload && payload.token_type === 'access') {
      return { ok: true, via: 'jwt', client_id: payload.client_id as string };
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
// MCP TOOL: ask_chatgpt_review (existing logic, unchanged)
// ============================================================================

function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return '{' + entries.map(([k, v]) => JSON.stringify(k) + ':' + canonicalJson(v)).join(',') + '}';
  }
  return 'null';
}

function utcDateBucket(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

interface ReviewResult {
  verdict: 'agree' | 'disagree' | 'partial';
  risk_level: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  corrected_action: string;
  requires_pk_escalation: boolean;
  escalation_reason: string;
  pushback_points: string[];
  verified_claims: string[];
  unverified_claims: string[];
  assumptions: string[];
}

type RoutingDecision =
  | 'proceed' | 'apply_corrected'
  | 'escalate_disagree' | 'escalate_high_risk' | 'escalate_low_confidence'
  | 'escalate_explicit_flag' | 'escalate_partial_no_correction'
  | 'escalate_schema_invalid' | 'escalate_timeout' | 'escalate_refusal';

interface RoutingOutcome {
  decision: RoutingDecision;
  escalate: boolean;
  reason: string;
}

function routeReview(r: ReviewResult | null, error?: string): RoutingOutcome {
  if (error === 'schema_invalid') return { decision: 'escalate_schema_invalid', escalate: true, reason: 'ChatGPT response did not match schema' };
  if (error === 'timeout')        return { decision: 'escalate_timeout', escalate: true, reason: 'ChatGPT call timed out' };
  if (error === 'empty_output')   return { decision: 'escalate_refusal', escalate: true, reason: 'ChatGPT returned empty output' };
  if (error)                      return { decision: 'escalate_refusal', escalate: true, reason: `Worker error: ${error}` };
  if (!r)                         return { decision: 'escalate_refusal', escalate: true, reason: 'No review parsed' };

  if (r.requires_pk_escalation) return { decision: 'escalate_explicit_flag', escalate: true, reason: r.escalation_reason || 'Reviewer requested escalation' };
  if (r.verdict === 'disagree') return { decision: 'escalate_disagree', escalate: true, reason: 'Reviewer disagrees with proposal' };
  if (r.risk_level === 'high')  return { decision: 'escalate_high_risk', escalate: true, reason: 'High risk level — human approval required' };
  if (r.confidence === 'low')   return { decision: 'escalate_low_confidence', escalate: true, reason: 'Reviewer has low confidence in own review' };

  if (r.verdict === 'partial') {
    if (!r.corrected_action || r.corrected_action.trim().length === 0) {
      return { decision: 'escalate_partial_no_correction', escalate: true, reason: 'Partial verdict without corrected_action' };
    }
    return { decision: 'apply_corrected', escalate: false, reason: 'Reviewer suggests correction; safe to apply' };
  }

  return { decision: 'proceed', escalate: false, reason: 'Reviewer agrees; safe to proceed' };
}

const TOOL_DEFINITION = {
  name: 'ask_chatgpt_review',
  description: 'Cross-check a Claude proposal with ChatGPT (gpt-4o-mini) before executing it. Returns a structured review with verdict, risk_level, confidence, and a backend-determined routing decision. The bridge auto-escalates to PK on disagree, high risk, low confidence, refusal, timeout, or partial-without-correction. Claude should call this BEFORE any destructive action (production SQL DML/DDL, EF deploys, config changes affecting clients) and BEFORE any plan that involves multiple coordinated steps. Idempotent within a UTC day on identical inputs (no double-charge).',
  inputSchema: {
    type: 'object',
    properties: {
      proposal: { type: 'string', description: 'Full prose description of what Claude is about to do. Be specific. Include the exact SQL / config change / file edit being proposed.' },
      context: { type: 'object', description: 'Structured context: SQL queries Claude has already run + their results, files Claude has read, evidence Claude has gathered, relevant constraints. Will be canonicalised + hashed for idempotency. Truncated at 50KB.' },
      action_type: { type: 'string', enum: ['sql_destructive', 'sql_read', 'ef_deploy', 'config_change', 'plan_review', 'finding_classification', 'other'], description: 'Category of action being proposed.' }
    },
    required: ['proposal', 'context', 'action_type']
  }
};

async function handleToolCall(args: any) {
  const t0 = Date.now();
  const proposal = String(args?.proposal ?? '');
  const action_type = String(args?.action_type ?? 'other');
  let context: Record<string, unknown> = (args?.context && typeof args.context === 'object') ? args.context : {};

  let truncated = false;
  let contextJson = canonicalJson(context);
  if (contextJson.length > MAX_CONTEXT_BYTES) {
    truncated = true;
    context = { _truncated: true, _original_size_bytes: contextJson.length, summary: contextJson.slice(0, MAX_CONTEXT_BYTES - 200) + '...[TRUNCATED]' };
    contextJson = canonicalJson(context);
  }

  const dateBucket = utcDateBucket();
  const context_hash = await sha256Hex(`${action_type}|${proposal}|${contextJson}`);
  const idempotency_key = await sha256Hex(`${action_type}|${proposal}|${contextJson}|${dateBucket}`);

  const { data: existing } = await supabase
    .schema('m').from('chatgpt_review')
    .select('id, verdict, risk_level, confidence, requires_pk_escalation, escalation_reason, routing_decision, response_jsonb, status')
    .eq('idempotency_key', idempotency_key)
    .neq('status', 'pending')
    .maybeSingle();

  if (existing && existing.routing_decision) {
    return {
      decision: existing.routing_decision,
      escalate: existing.routing_decision.startsWith('escalate_'),
      reason: 'Served from prior review (idempotency hit)',
      review: existing.response_jsonb,
      review_id: existing.id,
      idempotent: true
    };
  }

  const { data: inserted, error: insertErr } = await supabase
    .schema('m').from('chatgpt_review')
    .insert({
      action_type, proposal, context, context_hash, idempotency_key,
      model: 'gpt-4o-mini', schema_version: 'v1', status: 'pending',
      request_jsonb: { truncated, action_type }
    })
    .select('id').single();

  if (insertErr || !inserted) {
    const { data: existing2 } = await supabase
      .schema('m').from('chatgpt_review')
      .select('id, routing_decision, response_jsonb, status')
      .eq('idempotency_key', idempotency_key).maybeSingle();

    if (existing2 && existing2.routing_decision) {
      return {
        decision: existing2.routing_decision,
        escalate: String(existing2.routing_decision).startsWith('escalate_'),
        reason: 'Served from prior review (idempotency race)',
        review: existing2.response_jsonb, review_id: existing2.id, idempotent: true
      };
    }
    return {
      decision: 'escalate_refusal', escalate: true,
      reason: `DB insert failed: ${insertErr?.message ?? 'unknown'}`,
      review: null, review_id: existing2?.id ?? null, idempotent: false
    };
  }

  const reviewId = inserted.id as string;

  let workerResp: any = null;
  let workerError: string | undefined;
  try {
    const r = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${INTERNAL_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposal, context, action_type })
    });
    workerResp = await r.json();
    if (!workerResp?.ok) workerError = workerResp?.error ?? `http_${r.status}`;
  } catch (e) {
    workerError = `fetch_failed: ${String(e)}`;
  }

  const review: ReviewResult | null = workerResp?.review ?? null;
  const routing = routeReview(review, workerError);

  const updatePayload: Record<string, unknown> = {
    status: routing.escalate ? 'escalated' : 'completed',
    routing_decision: routing.decision,
    response_id: workerResp?.response_id ?? null,
    response_jsonb: review,
    verdict: review?.verdict ?? null,
    risk_level: review?.risk_level ?? null,
    confidence: review?.confidence ?? null,
    requires_pk_escalation: review?.requires_pk_escalation ?? null,
    escalation_reason: review?.escalation_reason ?? routing.reason,
    input_tokens: workerResp?.input_tokens ?? null,
    output_tokens: workerResp?.output_tokens ?? null,
    latency_ms: workerResp?.latency_ms ?? (Date.now() - t0),
    error_message: workerError ?? null,
    action_taken: routing.decision
  };
  if (routing.escalate) updatePayload.escalated_at = new Date().toISOString();

  const { error: updateErr } = await supabase
    .schema('m').from('chatgpt_review').update(updatePayload).eq('id', reviewId);

  return {
    decision: routing.decision, escalate: routing.escalate, reason: routing.reason,
    review, review_id: reviewId, idempotent: false,
    db_update_error: updateErr?.message ?? null
  };
}

async function handleRpc(msg: any): Promise<any | null> {
  const id = msg?.id ?? null;
  const method = msg?.method;
  const params = msg?.params;

  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO } };
  }
  if (method === 'notifications/initialized') return null;
  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: [TOOL_DEFINITION] } };
  }
  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments ?? {};
    if (name !== 'ask_chatgpt_review') {
      return { jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${name}` } };
    }
    try {
      const result = await handleToolCall(args);
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false } };
    } catch (e) {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Tool execution error: ${String(e)}` }], isError: true } };
    }
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
    return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: `Parse error: ${String(e)}` } }, { status: 400 });
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

  if (req.method === 'POST' && path === '/register') return await handleRegister(req);
  if (req.method === 'GET'  && path === '/authorize') return await handleAuthorizeGet(req);
  if (req.method === 'POST' && path === '/authorize') return await handleAuthorizePost(req);
  if (req.method === 'POST' && path === '/token') return await handleToken(req);

  if (req.method === 'GET' && (path === '/' || path === '')) {
    return jsonResponse({ ok: true, server: SERVER_INFO, oauth_metadata: `${BRIDGE_BASE_URL}/.well-known/oauth-authorization-server` });
  }

  if (req.method === 'POST' && (path === '/' || path === '')) return await handleMcpPost(req);

  return new Response('Not found', { status: 404, headers: CORS_HEADERS });
});
