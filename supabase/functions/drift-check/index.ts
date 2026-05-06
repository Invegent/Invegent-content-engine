// supabase/functions/drift-check/index.ts
//
// drift-check-v1.0.1 — Edge Function source drift detector
// F-EF-DRIFT-PREVENTION Stage 2a (Option F backend).
//
// Iterates deployed Edge Functions, compares against repo source on `main`,
// classifies drift per the taxonomy locked in
// docs/briefs/2026-05-05-f-ef-drift-prevention.md, and writes one batch per
// run to m.ef_drift_log via public.write_ef_drift_log(jsonb).
//
// Invocation
//   POST /functions/v1/drift-check?write=<bool>&slug=<optional>
//   - write=true     -> writes rows via writer fn (cron path)
//   - write=false or omitted -> dry-run, returns classification, writes nothing (default)
//   - slug=<name>    -> single-slug mode (smoke test)
//
// Auth
//   verify_jwt:false in config (matches draft-notifier convention).
//   Self-validates Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>.
//
// Required env (only one new secret vs existing project)
//   SUPABASE_URL                  (auto-injected by Supabase EF runtime)
//   SUPABASE_SERVICE_ROLE_KEY     (auto-injected by Supabase EF runtime)
//   GITHUB_PAT                    (existing project secret — fine-grained, read-only)
//   SUPABASE_ACCESS_TOKEN         (NEW — sbp_... Management API PAT)
//
// Hardcoded (project-specific constants, not secrets)
//   GITHUB_OWNER = "Invegent"
//   GITHUB_REPO  = "Invegent-content-engine"
//   GITHUB_REF   = "main"
//   PROJECT_REF derived from SUPABASE_URL hostname.
//
// Hard guarantees
//   - Missing required env -> HTTP 500 JSON, no DB writes.
//   - Unauthorised bearer -> HTTP 401 JSON, no DB writes.
//   - Per-slug fetch failure -> entry in `errors[]`, batch continues.
//   - writeFlag is strict equality to "true"; anything else is dry-run.
//
// Changelog
//   v1.0.1 (2026-05-06) — Read GitHub auth from existing GITHUB_PAT secret.
//                         Hardcode owner/repo/ref. Derive PROJECT_REF from
//                         SUPABASE_URL. Reduces required new secrets from 5 to 1.
//   v1.0.0 (2026-05-06) — Initial Stage 2a backend (D-01 review_id 48033af8).

const VERSION = "drift-check-v1.0.1";

// ---------- hardcoded project constants ----------

const GITHUB_OWNER = "Invegent";
const GITHUB_REPO = "Invegent-content-engine";
const GITHUB_REF = "main";

// ---------- env ----------

interface RequiredEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ACCESS_TOKEN: string;
  GITHUB_PAT: string;
  PROJECT_REF: string; // derived from SUPABASE_URL
}

const REQUIRED_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "GITHUB_PAT",
] as const;

function deriveProjectRef(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname; // e.g. "mbkmaxqhsohbtwsqolns.supabase.co"
    const ref = host.split(".")[0];
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

function parseBannerVersion(body: string, slug: string): string | null {
  // Pattern 1: `const VERSION = '...'` or `const VERSION = "..."`
  const p1 = body.match(/const\s+VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (p1) return p1[1];
  // Pattern 2: SERVER_INFO = { ... version: '...' ... }
  const p2 = body.match(
    /SERVER_INFO[\s\S]{0,200}?version\s*:\s*['"]([^'"]+)['"]/,
  );
  if (p2) return p2[1];
  // Pattern 3: <slug>-vX.Y.Z banner string
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const p3 = body.match(new RegExp(`${escaped}-v(\\d+\\.\\d+\\.\\d+)`));
  if (p3) return p3[1];
  return null;
}

type VersionCmp = "lt" | "eq" | "gt" | "incomparable";

function compareVersions(a: string | null, b: string | null): VersionCmp {
  if (!a || !b) return "incomparable";
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

// SECURITY-DEFINER regression-risk detector.
// repo has risky `.rpc('exec_sql')` + UPDATE c/m/f/t within 500 chars,
// AND deployed has been refactored away from the same pattern.
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

  // Repo has it. If deployed missing, redeploy = risk.
  if (!deployedBody) return true;

  const deployedHasRisky = hasRiskyPattern(deployedBody);
  // Regression risk only when repo has the pattern and deployed has been refactored away.
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
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` },
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

async function fetchDeployedBody(
  env: RequiredEnv,
  slug: string,
): Promise<string> {
  const url =
    `https://api.supabase.com/v1/projects/${env.PROJECT_REF}/functions/${slug}/body`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `fetch_deployed ${slug} ${resp.status}: ${body.slice(0, 200)}`,
    );
  }
  const text = await resp.text();
  // Defensive: handle 3 possible response shapes.
  // Shape 1: raw text (just the source)
  // Shape 2: JSON { body: "..." }
  // Shape 3: JSON array of files [{ name, content }, ...]
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (typeof parsed.body === "string") return parsed.body;
      if (typeof parsed.content === "string") return parsed.content;
    }
    if (Array.isArray(parsed)) {
      const indexFile = parsed.find(
        (f: { name?: string }) => f && f.name === "index.ts",
      );
      if (indexFile && typeof indexFile.content === "string") {
        return indexFile.content;
      }
      const concatenated = parsed
        .filter((f: { content?: string }) => typeof f.content === "string")
        .map((f: { content: string }) => f.content)
        .join("\n");
      if (concatenated.length > 0) return concatenated;
    }
    // Parsed JSON but no recognised shape — treat raw response as source.
    return text;
  } catch {
    // Not JSON — raw text source.
    return text;
  }
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
    // present
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

// ---------- batch writer ----------

interface WriteResult {
  inserted: number;
}

async function writeBatch(
  env: RequiredEnv,
  rows: DriftRow[],
): Promise<WriteResult> {
  const url = `${env.SUPABASE_URL}/rest/v1/rpc/write_ef_drift_log`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ p_rows: rows }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`writer_rpc ${resp.status}: ${body.slice(0, 300)}`);
  }
  const data = await resp.json();
  const inserted = Array.isArray(data) ? data.length : 0;
  return { inserted };
}

// ---------- handler ----------

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const writeFlag = url.searchParams.get("write") === "true"; // strict opt-in
  const slugFilter = url.searchParams.get("slug");

  // Auth: self-validate service_role bearer (verify_jwt:false convention).
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const presentedToken = tokenMatch ? tokenMatch[1].trim() : null;
  if (!expected || !presentedToken || presentedToken !== expected) {
    return new Response(
      JSON.stringify({
        ok: false,
        version: VERSION,
        error: "unauthorized: service_role bearer required",
        wrote_rows: false,
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Env validation.
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
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  const env = envRes.env;

  const errors: Array<{ slug: string; stage: string; message: string }> = [];

  // List deployed EFs (hard requirement; fail closed).
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
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // List repo dirs (soft requirement; record error and continue).
  let repoDirs: string[] = [];
  try {
    repoDirs = await listRepoFunctionDirs(env);
  } catch (e) {
    errors.push({
      slug: "<repo-list>",
      stage: "list_repo_dirs",
      message: (e as Error).message,
    });
  }

  const deployedSlugs = new Set(deployed.map((d) => d.slug));
  const repoOnlyDirs = repoDirs.filter((d) => !deployedSlugs.has(d));

  // Filter to single slug if requested (smoke-test mode).
  const slugsToProcess = slugFilter
    ? deployed.filter((d) => d.slug === slugFilter)
    : deployed;
  if (slugFilter && slugsToProcess.length === 0) {
    return new Response(
      JSON.stringify({
        ok: false,
        version: VERSION,
        error: `slug not found in deployed functions: ${slugFilter}`,
        deployed_slugs_sample: deployed.slice(0, 10).map((d) => d.slug),
        wrote_rows: false,
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const rows: DriftRow[] = [];

  // Iterate deployed slugs serially.
  for (const fn of slugsToProcess) {
    const slug = fn.slug;
    let deployedRaw: string;
    try {
      deployedRaw = await fetchDeployedBody(env, slug);
    } catch (e) {
      errors.push({
        slug,
        stage: "fetch_deployed",
        message: (e as Error).message,
      });
      continue;
    }

    let repoRaw: string | null = null;
    let repoPathStatus: "present" | "missing" = "present";
    try {
      const r = await fetchRepoBody(env, slug);
      if (r === null) {
        repoPathStatus = "missing";
      } else {
        repoRaw = r;
      }
    } catch (e) {
      errors.push({
        slug,
        stage: "fetch_repo",
        message: (e as Error).message,
      });
      continue;
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
      errors.push({
        slug,
        stage: "hash",
        message: (e as Error).message,
      });
      continue;
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

    rows.push({
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
    });
  }

  // Add repo-only directory rows (only when not filtering to a single slug).
  if (!slugFilter) {
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

  // Tallies.
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

  // Optionally write the batch.
  let wroteRows = false;
  let writerInserted = 0;
  if (writeFlag && rows.length > 0) {
    try {
      const w = await writeBatch(env, rows);
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

  const durationMs = Date.now() - startedAt;
  const summary = {
    ok: errors.length === 0,
    version: VERSION,
    write_mode: writeFlag,
    wrote_rows: wroteRows,
    writer_inserted: writerInserted,
    slug_filter: slugFilter,
    project_ref: env.PROJECT_REF,
    total_rows: rows.length,
    deployed_count: deployed.length,
    repo_only_count: repoOnlyDirs.length,
    by_class: byClass,
    by_severity: bySeverity,
    security_definer_risk_count: sdRiskCount,
    security_definer_risk_slugs: sdRiskSlugs,
    errors,
    duration_ms: durationMs,
    // Include classification rows in dry-run for inspection. Omit on full write
    // to keep response payload small.
    rows: writeFlag ? undefined : rows,
  };

  return new Response(JSON.stringify(summary, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
