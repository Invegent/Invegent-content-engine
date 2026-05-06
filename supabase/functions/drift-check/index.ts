// supabase/functions/drift-check/index.ts
//
// drift-check-v1.0.8 — Edge Function source drift detector
// F-EF-DRIFT-PREVENTION Stage 2a (Option F backend).
//
// CRITICAL FIX in v1.0.8: fetchDeployedBody now correctly parses
// multipart/form-data from /v1/projects/{ref}/functions/{slug}/body.
// v1.0.7 and earlier text-parsed multipart bytes (boundary markers, headers)
// instead of extracting the actual index.ts file, which produced false-
// positive drift on every deployed Edge Function. Confirmed via
// `npx supabase functions download` source code in supabase/cli@main —
// the CLI sends `Accept: multipart/form-data` and parses the resulting
// form, finding the entrypoint file by metadata.entrypoint_path or
// falling back to index.ts.
//
// Investigation evidence (F1, 2026-05-06):
//   - publisher CLI download: normalised SHA-256 91d26289... matches repo
//   - publisher drift-check v1.0.7: normalised SHA-256 5a399748... — wrong artefact
//   - 47-of-47 universal "drift" was a fetch bug, not real drift
//   - Now fixed; expected post-fix: most EFs Class A (clean) or A-LE
//     (line-ending only), with a small number of real Class B/C/D drifts.
//
// Iterates a *slice* of deployed Edge Functions, compares against repo source
// on `main`, classifies drift per the taxonomy locked in
// docs/briefs/2026-05-05-f-ef-drift-prevention.md, and writes one batch per
// invocation to m.ef_drift_log via public.write_ef_drift_log(jsonb, uuid).
//
// Multi-invocation chunking — v1.0.6+ design.
//   v1.0.5 chunked-parallel processing in a single invocation hit Supabase EF
//   WORKER_RESOURCE_LIMIT (~45-60s budget, sub-wall-clock cause). v1.0.6+
//   processes a fixed-size slice per invocation; orchestrator (manual or cron)
//   walks the offsets to cover the full deployed inventory. Chunks of one
//   logical scan are grouped via a shared scan_id, which the EF passes
//   verbatim as the writer fn's p_run_id (column m.ef_drift_log.drift_check_run_id).
//
// Invocation
//   POST /functions/v1/drift-check
//        ?write=<bool>&slug=<optional>
//        &offset=<int>&limit=<int>&scan_id=<uuid>&concurrency=<N>
//
// Auth
//   verify_jwt:false in config (matches draft-notifier convention).
//
// Required env
//   SUPABASE_URL                  (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY     (auto-injected; used to call writer RPC)
//   GITHUB_PAT                    (existing project secret)
//   MANAGEMENT_API_TOKEN          (sbp_... Supabase Management API PAT)
//
// Hardcoded
//   GITHUB_OWNER = "Invegent"
//   GITHUB_REPO  = "Invegent-content-engine"
//   GITHUB_REF   = "main"
//   PROJECT_REF  = derived from SUPABASE_URL hostname.
//   DEFAULT_LIMIT = 10, MAX_LIMIT = 10, DEFAULT_CONCURRENCY = 10,
//   MAX_CONCURRENCY = 20.
//
// Hard guarantees
//   - Missing required env -> HTTP 500 JSON, no DB writes.
//   - Per-slug fetch failure -> entry in `errors[]`, batch continues.
//   - writeFlag is strict equality to "true"; anything else is dry-run.
//   - One drift_check_run_id per invocation when scan_id provided; same
//     run_id reused across chunks of one logical scan.
//   - Repo-only directory rows are emitted ONLY on the first chunk
//     (offset=0) to avoid duplication across chunks of one scan.
//
// Changelog
//   v1.0.8 (2026-05-06) — F1 fix: multipart/form-data parsing for
//                         /functions/{slug}/body. Sends Accept header,
//                         parses Response.formData(), reads entrypoint_path
//                         from "metadata" form value, picks matching file
//                         with sensible fallbacks. Verified against CLI
//                         download for publisher (true clean baseline).
//   v1.0.7 — scan_id flows to drift_check_run_id via writer fn p_run_id
//            (now applies to a CORRECT body — earlier versions hashed
//             the multipart wire format).
//   v1.0.6 — multi-invocation chunking (offset/limit/scan_id), notes prefix
//            (superseded by v1.0.7).
//   v1.0.5 — chunked parallel within single invocation (insufficient).
//   v1.0.4 — banner-version parser fix.
//   v1.0.3 — drop internal bearer self-validation.
//   v1.0.2 — rename to MANAGEMENT_API_TOKEN.
//   v1.0.1 — read GitHub auth from existing GITHUB_PAT.
//   v1.0.0 — initial Stage 2a backend.

const VERSION = "drift-check-v1.0.8";

// ---------- hardcoded project constants ----------

const GITHUB_OWNER = "Invegent";
const GITHUB_REPO = "Invegent-content-engine";
const GITHUB_REF = "main";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 10;
const DEFAULT_CONCURRENCY = 10;
const MAX_CONCURRENCY = 20;

// ---------- env ----------

interface RequiredEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MANAGEMENT_API_TOKEN: string;
  GITHUB_PAT: string;
  PROJECT_REF: string;
}

const REQUIRED_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MANAGEMENT_API_TOKEN",
  "GITHUB_PAT",
] as const;

function deriveProjectRef(url: string): string | null {
  try {
    const parsed = new URL(url);
    const ref = parsed.hostname.split(".")[0];
    if (!ref || ref.length < 8) return null;
    return ref;
  } catch {
    return null;
  }
}

function readEnv():
  | { ok: true; env: RequiredEnv }
  | { ok: false; missing: string[]; reason?: string } {
  const env: Record<string, string> = {};
  const missing: string[] = [];
  for (const key of REQUIRED_ENV_KEYS) {
    const v = Deno.env.get(key);
    if (!v) missing.push(key);
    else env[key] = v;
  }
  if (missing.length > 0) return { ok: false, missing };

  const projectRef = deriveProjectRef(env.SUPABASE_URL);
  if (!projectRef) {
    return {
      ok: false,
      missing: [],
      reason: `could not derive project ref from SUPABASE_URL: ${env.SUPABASE_URL}`,
    };
  }
  env.PROJECT_REF = projectRef;
  return { ok: true, env: env as unknown as RequiredEnv };
}

// ---------- helpers ----------

function normaliseLineEndings(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractSemver(raw: string): string {
  const m = raw.match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : raw;
}

function parseBannerVersion(body: string, slug: string): string | null {
  const p1 = body.match(/const\s+VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (p1) return extractSemver(p1[1]);
  const p2 = body.match(
    /SERVER_INFO[\s\S]{0,200}?version\s*:\s*['"]([^'"]+)['"]/,
  );
  if (p2) return extractSemver(p2[1]);
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const p3 = body.match(new RegExp(`${escaped}-v(\\d+\\.\\d+\\.\\d+)`));
  if (p3) return p3[1];
  return null;
}

type VersionCmp = "lt" | "eq" | "gt" | "incomparable";

function compareVersions(a: string | null, b: string | null): VersionCmp {
  if (!a || !b) return "incomparable";
  if (a === b) return "eq";
  const stripV = (s: string) => s.replace(/^v/i, "");
  const ax = stripV(a).split(".").map((p) => parseInt(p, 10));
  const bx = stripV(b).split(".").map((p) => parseInt(p, 10));
  if (ax.some((n) => Number.isNaN(n))) return "incomparable";
  if (bx.some((n) => Number.isNaN(n))) return "incomparable";
  const len = Math.max(ax.length, bx.length);
  for (let i = 0; i < len; i++) {
    const ai = ax[i] ?? 0;
    const bi = bx[i] ?? 0;
    if (ai > bi) return "gt";
    if (ai < bi) return "lt";
  }
  return "eq";
}

function detectSecurityDefinerRegressionRisk(
  repoBody: string | null,
  deployedBody: string | null,
): boolean {
  if (!repoBody) return false;
  const rpcRe = /\.rpc\s*\(\s*['"]exec_sql['"]/g;
  const updateRe = /UPDATE\s+[cmft]\./i;

  const hasRiskyPattern = (body: string): boolean => {
    rpcRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rpcRe.exec(body)) !== null) {
      const window = body.slice(m.index, m.index + 500);
      if (updateRe.test(window)) return true;
    }
    return false;
  };

  const repoHasRisky = hasRiskyPattern(repoBody);
  if (!repoHasRisky) return false;
  if (!deployedBody) return true;
  const deployedHasRisky = hasRiskyPattern(deployedBody);
  return repoHasRisky && !deployedHasRisky;
}

// ---------- fetchers ----------

interface DeployedFn {
  slug: string;
  version: number;
}

async function listDeployedFunctions(env: RequiredEnv): Promise<DeployedFn[]> {
  const url =
    `https://api.supabase.com/v1/projects/${env.PROJECT_REF}/functions`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${env.MANAGEMENT_API_TOKEN}` },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`list_functions ${resp.status}: ${body.slice(0, 200)}`);
  }
  const arr = await resp.json();
  if (!Array.isArray(arr)) {
    throw new Error("list_functions: expected array response");
  }
  return arr.map((f: { slug: string; version: number }) => ({
    slug: f.slug,
    version: f.version,
  }));
}

// v1.0.8: parses multipart/form-data response from
// GET /v1/projects/{ref}/functions/{slug}/body. The Supabase Management API
// returns the deployed function as a multipart form: one "metadata" form
// value (JSON with entrypoint_path), plus one or more file parts. We send
// `Accept: multipart/form-data` and use Response.formData() to parse, then
// pick the entrypoint file (or fall back to index.ts).
async function fetchDeployedBody(
  env: RequiredEnv,
  slug: string,
): Promise<string> {
  const url =
    `https://api.supabase.com/v1/projects/${env.PROJECT_REF}/functions/${slug}/body`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.MANAGEMENT_API_TOKEN}`,
      Accept: "multipart/form-data",
    },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `fetch_deployed ${slug} ${resp.status}: ${body.slice(0, 200)}`,
    );
  }

  const contentType = resp.headers.get("Content-Type") || "";
  if (!contentType.startsWith("multipart/")) {
    const body = await resp.text();
    throw new Error(
      `fetch_deployed ${slug}: expected multipart response, got Content-Type='${contentType}'; body[0:200]: ${
        body.slice(0, 200)
      }`,
    );
  }

  // Web Fetch API can parse multipart/form-data via Response.formData().
  let formData: FormData;
  try {
    formData = await resp.formData();
  } catch (e) {
    throw new Error(
      `fetch_deployed ${slug}: failed to parse multipart form: ${
        (e as Error).message
      }`,
    );
  }

  // 1. Try to read entrypoint_path from "metadata" form value.
  let entrypointPath: string | null = null;
  const metadataValue = formData.get("metadata");
  if (metadataValue !== null) {
    let metaText: string | null = null;
    if (typeof metadataValue === "string") {
      metaText = metadataValue;
    } else if (metadataValue instanceof File) {
      metaText = await metadataValue.text();
    }
    if (metaText) {
      try {
        const meta = JSON.parse(metaText);
        if (typeof meta?.entrypoint_path === "string") {
          entrypointPath = meta.entrypoint_path;
        }
      } catch {
        // metadata not JSON; proceed without entrypoint hint
      }
    }
  }

  // 2. Collect all file parts.
  type MpFile = { name: string; content: string };
  const files: MpFile[] = [];
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const text = await value.text();
      const name = value.name || key;
      files.push({ name, content: text });
    }
  }

  if (files.length === 0) {
    throw new Error(`fetch_deployed ${slug}: no files in multipart response`);
  }

  // 3. Pick the entrypoint file.
  // entrypointPath may look like "file:///src/index.ts", "/src/index.ts",
  // "src/index.ts", "index.ts", or similar. File names from Content-Disposition
  // may be just the basename, full path, or anything. We try several
  // matching strategies in order of strictness, falling back to "index.ts".
  let chosen: MpFile | null = null;

  if (entrypointPath) {
    let entrypointPathname = entrypointPath;
    try {
      // Parse as URL to strip "file://" scheme if present.
      const u = new URL(entrypointPath);
      entrypointPathname = u.pathname;
    } catch {
      // not a URL — leave as-is
    }
    // Normalise: remove leading slash for fuzzy matching
    const epClean = entrypointPathname.replace(/^\//, "");
    chosen = files.find((f) =>
      f.name === entrypointPath ||
      f.name === entrypointPathname ||
      f.name === epClean ||
      f.name.endsWith("/" + epClean) ||
      f.name.endsWith(epClean) ||
      epClean.endsWith(f.name)
    ) ?? null;
  }

  if (!chosen) {
    chosen = files.find((f) =>
      f.name === "index.ts" ||
      f.name.endsWith("/index.ts")
    ) ?? null;
  }

  if (!chosen) {
    // Last resort: first .ts file
    chosen = files.find((f) => f.name.endsWith(".ts")) ?? null;
  }

  if (!chosen) {
    chosen = files[0];
  }

  return chosen.content;
}

async function fetchRepoBody(
  env: RequiredEnv,
  slug: string,
): Promise<string | null> {
  const path = `supabase/functions/${slug}/index.ts`;
  const url =
    `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_REF}/${path}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      "User-Agent": "drift-check/1.0",
    },
  });
  if (resp.status === 404) return null;
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`fetch_repo ${slug} ${resp.status}: ${body.slice(0, 200)}`);
  }
  return await resp.text();
}

async function listRepoFunctionDirs(env: RequiredEnv): Promise<string[]> {
  const url =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/supabase/functions?ref=${GITHUB_REF}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "drift-check/1.0",
    },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`list_repo_dirs ${resp.status}: ${body.slice(0, 200)}`);
  }
  const arr = await resp.json();
  if (!Array.isArray(arr)) {
    throw new Error("list_repo_dirs: expected array response");
  }
  return arr
    .filter((item: { type?: string }) => item && item.type === "dir")
    .map((item: { name: string }) => item.name);
}

// ---------- classification ----------

interface DriftRow {
  slug: string;
  current_class: string;
  severity: string;
  repo_path_status: string;
  deploy_version: string | null;
  deployed_hash: string | null;
  deployed_hash_normalised: string | null;
  repo_version: string | null;
  repo_hash: string | null;
  repo_hash_normalised: string | null;
  direction: string | null;
  security_definer_regression_risk: boolean;
  notes: string | null;
}

interface ClassifyArgs {
  slug: string;
  deployVersion: string | null;
  deployedRaw: string | null;
  deployedNormalised: string | null;
  repoRaw: string | null;
  repoNormalised: string | null;
  repoVersion: string | null;
  repoPathStatus: "present" | "missing" | "repo_only";
  sdRisk: boolean;
}

interface ClassifyResult {
  current_class: string;
  direction: string;
  severity: string;
  notes: string | null;
}

function classify(args: ClassifyArgs): ClassifyResult {
  const {
    repoPathStatus,
    deployedNormalised,
    repoNormalised,
    deployedRaw,
    repoRaw,
    deployVersion,
    repoVersion,
    sdRisk,
  } = args;

  let current_class = "A";
  let direction = "clean";
  let severity = "none";
  let notes: string | null = null;

  if (repoPathStatus === "repo_only") {
    current_class = "repo-only";
    direction = "forward-drift";
    severity = "P3";
    notes = "Repo directory has no deployed slug.";
  } else if (repoPathStatus === "missing") {
    current_class = "D";
    direction = "regression-risk";
    severity = "P2";
    notes = "Deployed slug has no repo directory.";
  } else {
    if (deployedNormalised === repoNormalised) {
      current_class = deployedRaw === repoRaw ? "A" : "A-LE";
      direction = "clean";
      severity = "none";
    } else {
      const cmp = compareVersions(deployVersion, repoVersion);
      if (cmp === "eq") {
        current_class = "C";
        direction = "regression-risk";
        severity = "P2";
        notes =
          "Banner versions equal but bodies diverge (Class C body-drift trap).";
      } else if (cmp === "gt") {
        current_class = "B-RR";
        direction = "regression-risk";
        severity = "P2";
        notes =
          `Deployed v${deployVersion} ahead of repo v${repoVersion} (regression risk on redeploy).`;
      } else if (cmp === "lt") {
        current_class = "B-FD";
        direction = "forward-drift";
        severity = "P3";
        notes =
          `Repo v${repoVersion} ahead of deployed v${deployVersion} (pending deploy).`;
      } else {
        current_class = "C";
        direction = "regression-risk";
        severity = "P2";
        notes =
          "Bodies diverge; banner versions unparseable or absent (default Class C).";
      }
    }
  }

  if (sdRisk) {
    severity = "P1";
    const sdNote =
      "SECURITY-DEFINER regression risk: repo redeploy would silently break production.";
    notes = notes ? `${notes} ${sdNote}` : sdNote;
  }

  return {
    current_class,
    direction,
    severity,
    notes: notes ? notes.trim() : null,
  };
}

// ---------- per-slug worker ----------

interface ProcessError {
  slug: string;
  stage: string;
  message: string;
}

type SlugResult = { kind: "row"; row: DriftRow } | {
  kind: "error";
  error: ProcessError;
};

async function processSlug(
  env: RequiredEnv,
  slug: string,
): Promise<SlugResult> {
  let deployedRaw: string;
  try {
    deployedRaw = await fetchDeployedBody(env, slug);
  } catch (e) {
    return {
      kind: "error",
      error: { slug, stage: "fetch_deployed", message: (e as Error).message },
    };
  }

  let repoRaw: string | null = null;
  let repoPathStatus: "present" | "missing" = "present";
  try {
    const r = await fetchRepoBody(env, slug);
    if (r === null) repoPathStatus = "missing";
    else repoRaw = r;
  } catch (e) {
    return {
      kind: "error",
      error: { slug, stage: "fetch_repo", message: (e as Error).message },
    };
  }

  const deployedNormalised = normaliseLineEndings(deployedRaw);
  const repoNormalised = repoRaw === null
    ? null
    : normaliseLineEndings(repoRaw);

  let deployedHash: string;
  let deployedHashNormalised: string;
  let repoHash: string | null = null;
  let repoHashNormalised: string | null = null;
  try {
    deployedHash = await sha256Hex(deployedRaw);
    deployedHashNormalised = await sha256Hex(deployedNormalised);
    if (repoRaw !== null && repoNormalised !== null) {
      repoHash = await sha256Hex(repoRaw);
      repoHashNormalised = await sha256Hex(repoNormalised);
    }
  } catch (e) {
    return {
      kind: "error",
      error: { slug, stage: "hash", message: (e as Error).message },
    };
  }

  const deployVersion = parseBannerVersion(deployedRaw, slug);
  const repoVersion = repoRaw === null
    ? null
    : parseBannerVersion(repoRaw, slug);

  const sdRisk = repoPathStatus === "present"
    ? detectSecurityDefinerRegressionRisk(repoRaw, deployedRaw)
    : false;

  const cls = classify({
    slug,
    deployVersion,
    deployedRaw,
    deployedNormalised,
    repoRaw,
    repoNormalised,
    repoVersion,
    repoPathStatus,
    sdRisk,
  });

  return {
    kind: "row",
    row: {
      slug,
      current_class: cls.current_class,
      severity: cls.severity,
      repo_path_status: repoPathStatus,
      deploy_version: deployVersion,
      deployed_hash: deployedHash,
      deployed_hash_normalised: deployedHashNormalised,
      repo_version: repoVersion,
      repo_hash: repoHash,
      repo_hash_normalised: repoHashNormalised,
      direction: cls.direction,
      security_definer_regression_risk: sdRisk,
      notes: cls.notes,
    },
  };
}

// ---------- batch writer ----------

async function writeBatch(
  env: RequiredEnv,
  rows: DriftRow[],
  runId: string,
): Promise<{ inserted: number }> {
  const url = `${env.SUPABASE_URL}/rest/v1/rpc/write_ef_drift_log`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ p_rows: rows, p_run_id: runId }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`writer_rpc ${resp.status}: ${body.slice(0, 300)}`);
  }
  const data = await resp.json();
  return { inserted: Array.isArray(data) ? data.length : 0 };
}

// ---------- handler ----------

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const writeFlag = url.searchParams.get("write") === "true";
  const slugFilter = url.searchParams.get("slug");

  const offsetRaw = url.searchParams.get("offset");
  const limitRaw = url.searchParams.get("limit");
  let offset = 0;
  if (offsetRaw) {
    const n = parseInt(offsetRaw, 10);
    if (!Number.isNaN(n) && n >= 0) offset = n;
  }
  let limit = DEFAULT_LIMIT;
  if (limitRaw) {
    const n = parseInt(limitRaw, 10);
    if (!Number.isNaN(n) && n >= 1) limit = Math.min(n, MAX_LIMIT);
  }

  let scanId = url.searchParams.get("scan_id");
  let scanIdGenerated = false;
  if (!scanId) {
    scanId = crypto.randomUUID();
    scanIdGenerated = true;
  }

  let concurrency = DEFAULT_CONCURRENCY;
  const concurrencyRaw = url.searchParams.get("concurrency");
  if (concurrencyRaw) {
    const n = parseInt(concurrencyRaw, 10);
    if (!Number.isNaN(n) && n >= 1) {
      concurrency = Math.min(n, MAX_CONCURRENCY);
    }
  }

  const envRes = readEnv();
  if (!envRes.ok) {
    return new Response(
      JSON.stringify({
        ok: false,
        version: VERSION,
        error: envRes.reason ?? "missing required environment variables",
        missing: envRes.missing,
        wrote_rows: false,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const env = envRes.env;

  const errors: ProcessError[] = [];

  const listPhaseStart = Date.now();
  let deployed: DeployedFn[];
  try {
    deployed = await listDeployedFunctions(env);
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false,
        version: VERSION,
        error: `list_deployed_functions failed: ${(e as Error).message}`,
        wrote_rows: false,
        scan_id: scanId,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  deployed.sort((a, b) => a.slug.localeCompare(b.slug));

  let repoDirs: string[] = [];
  const willEmitRepoOnly = !slugFilter && offset === 0;
  if (willEmitRepoOnly) {
    try {
      repoDirs = await listRepoFunctionDirs(env);
    } catch (e) {
      errors.push({
        slug: "<repo-list>",
        stage: "list_repo_dirs",
        message: (e as Error).message,
      });
    }
  }
  const listPhaseMs = Date.now() - listPhaseStart;

  const deployedSlugs = new Set(deployed.map((d) => d.slug));
  const repoOnlyDirs = repoDirs.filter((d) => !deployedSlugs.has(d));

  let slugsToProcess: DeployedFn[];
  let totalChunkSize: number;
  if (slugFilter) {
    slugsToProcess = deployed.filter((d) => d.slug === slugFilter);
    totalChunkSize = slugsToProcess.length;
    if (slugsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          version: VERSION,
          error: `slug not found in deployed functions: ${slugFilter}`,
          deployed_slugs_sample: deployed.slice(0, 10).map((d) => d.slug),
          wrote_rows: false,
          scan_id: scanId,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
  } else {
    slugsToProcess = deployed.slice(offset, offset + limit);
    totalChunkSize = slugsToProcess.length;
  }

  const processPhaseStart = Date.now();
  const rows: DriftRow[] = [];

  const effectiveConcurrency = slugFilter
    ? 1
    : Math.min(concurrency, slugsToProcess.length || 1);

  for (let i = 0; i < slugsToProcess.length; i += effectiveConcurrency) {
    const subChunk = slugsToProcess.slice(i, i + effectiveConcurrency);
    const results = await Promise.all(
      subChunk.map((fn) => processSlug(env, fn.slug)),
    );
    for (const r of results) {
      if (r.kind === "row") rows.push(r.row);
      else errors.push(r.error);
    }
  }

  if (willEmitRepoOnly) {
    for (const dir of repoOnlyDirs) {
      const cls = classify({
        slug: dir,
        deployVersion: null,
        deployedRaw: null,
        deployedNormalised: null,
        repoRaw: null,
        repoNormalised: null,
        repoVersion: null,
        repoPathStatus: "repo_only",
        sdRisk: false,
      });
      rows.push({
        slug: dir,
        current_class: cls.current_class,
        severity: cls.severity,
        repo_path_status: "repo_only",
        deploy_version: null,
        deployed_hash: null,
        deployed_hash_normalised: null,
        repo_version: null,
        repo_hash: null,
        repo_hash_normalised: null,
        direction: cls.direction,
        security_definer_regression_risk: false,
        notes: cls.notes,
      });
    }
  }
  const processPhaseMs = Date.now() - processPhaseStart;

  const byClass: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  let sdRiskCount = 0;
  const sdRiskSlugs: string[] = [];
  for (const r of rows) {
    byClass[r.current_class] = (byClass[r.current_class] ?? 0) + 1;
    bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1;
    if (r.security_definer_regression_risk) {
      sdRiskCount++;
      sdRiskSlugs.push(r.slug);
    }
  }

  const writerPhaseStart = Date.now();
  let wroteRows = false;
  let writerInserted = 0;
  if (writeFlag && rows.length > 0) {
    try {
      const w = await writeBatch(env, rows, scanId);
      wroteRows = true;
      writerInserted = w.inserted;
    } catch (e) {
      errors.push({
        slug: "<batch-write>",
        stage: "writer_rpc",
        message: (e as Error).message,
      });
    }
  }
  const writerPhaseMs = Date.now() - writerPhaseStart;

  const totalMs = Date.now() - startedAt;

  const nextOffset = slugFilter ? null : offset + slugsToProcess.length;
  const hasMore = !slugFilter && nextOffset !== null &&
    nextOffset < deployed.length;

  const summary = {
    ok: errors.length === 0,
    version: VERSION,
    write_mode: writeFlag,
    wrote_rows: wroteRows,
    writer_inserted: writerInserted,
    scan_id: scanId,
    scan_id_generated: scanIdGenerated,
    drift_check_run_id: scanId,
    slug_filter: slugFilter,
    offset: slugFilter ? null : offset,
    limit: slugFilter ? null : limit,
    next_offset: hasMore ? nextOffset : null,
    has_more: hasMore,
    chunk_size: totalChunkSize,
    concurrency: effectiveConcurrency,
    project_ref: env.PROJECT_REF,
    total_rows: rows.length,
    deployed_count: deployed.length,
    repo_only_count: willEmitRepoOnly ? repoOnlyDirs.length : 0,
    by_class: byClass,
    by_severity: bySeverity,
    security_definer_risk_count: sdRiskCount,
    security_definer_risk_slugs: sdRiskSlugs,
    errors,
    timing_ms: {
      total: totalMs,
      list_phase: listPhaseMs,
      process_phase: processPhaseMs,
      writer_phase: writerPhaseMs,
    },
    rows: writeFlag ? undefined : rows,
  };

  return new Response(JSON.stringify(summary, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
