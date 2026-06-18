// AGP D-01 Phase 3.1 — avatar shadow-resolver validation (PGlite).
// Loads the REAL migration SQL (the table + the public.resolve_and_record_avatar_shadow
// function), seeds c.brand_avatar / c.brand_stakeholder / m.post_draft, and exercises the
// drift classification + deterministic ordering + write-isolation invariants. Pure logic, no prod.
//
// Run (from repo root):
//   npm i --no-save @electric-sql/pglite && node docs/briefs/agp-d01-3-avatar-shadow-validation.mjs
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const ROOT = process.env.ICE_ROOT
  ?? "C:/Users/parve/Invegent-content-engine/.claude/worktrees/agent-a902d65ef0608b445";
const MIG = readFileSync(
  `${ROOT}/supabase/migrations/20260618090000_agp_d01_3_avatar_shadow_resolver_telemetry.sql`,
  "utf8",
).replace(/\r\n/g, "\n");

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
let pass = 0, fail = 0;
const check = (n, c, d = "") => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };

// ── minimal prod surface (schemas c / m / r, roles, stub of the live tables) ──
await db.exec(`
CREATE SCHEMA IF NOT EXISTS c;
CREATE SCHEMA IF NOT EXISTS m;
CREATE SCHEMA IF NOT EXISTS r;
-- roles referenced by the grants in the migration
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='postgres') THEN CREATE ROLE postgres; END IF;
END $$;

CREATE TABLE m.post_draft (post_draft_id uuid PRIMARY KEY DEFAULT gen_random_uuid());

CREATE TABLE c.brand_stakeholder (
  stakeholder_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code text, is_active boolean DEFAULT true);

CREATE TABLE c.brand_avatar (
  brand_avatar_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id uuid, client_id uuid,
  heygen_avatar_id text, heygen_voice_id text,
  render_style text DEFAULT 'realistic',
  is_active boolean, is_primary boolean NOT NULL DEFAULT false,
  is_default_host boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now());
`);

// real migration (table r.avatar_resolution_shadow + the RPC + grants)
await db.exec(MIG);

// helpers ────────────────────────────────────────────────────────────────────
const CLIENT = "11111111-1111-1111-1111-111111111111";
async function mkStakeholder(role) {
  return (await one(`INSERT INTO c.brand_stakeholder (role_code) VALUES ($1) RETURNING stakeholder_id`, [role])).stakeholder_id;
}
// avatar with explicit id + created_at offset (seconds) for total-order control
async function mkAvatar({ stakeholder, avatarId, voiceId = null, style = "realistic",
  active = true, primary = false, defaultHost = false, createdOffsetSec = 0, id = null }) {
  return (await one(`
    INSERT INTO c.brand_avatar (brand_avatar_id, stakeholder_id, client_id, heygen_avatar_id, heygen_voice_id,
      render_style, is_active, is_primary, is_default_host, created_at)
    VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, now() + ($10||' seconds')::interval)
    RETURNING brand_avatar_id`,
    [id, stakeholder, CLIENT, avatarId, voiceId, style, active, primary, defaultHost, createdOffsetSec])).brand_avatar_id;
}
async function mkDraft() {
  return (await one(`INSERT INTO m.post_draft DEFAULT VALUES RETURNING post_draft_id`)).post_draft_id;
}
const callShadow = async ({ draft = null, role = null, style = "realistic",
  liveAvatar = null, liveVoice = null, liveBy = "fallback_limit1", run = null }) =>
  (await one(`SELECT public.resolve_and_record_avatar_shadow($1,$2,$3,$4,$5,$6,$7,$8) AS rec`,
    [draft, CLIENT, role, style, liveAvatar, liveVoice, liveBy, run])).rec;

console.log("\n== AGP D-01 Phase 3.1 — avatar shadow-resolver validation ==");

// reset rows between scenarios to isolate candidate sets
const wipe = async () => { await db.exec(`DELETE FROM c.brand_avatar; DELETE FROM c.brand_stakeholder;`); };

// 1. agree (drift none): single candidate, live == shadow
{
  const sh = await mkStakeholder("founder");
  await mkAvatar({ stakeholder: sh, avatarId: "AV_ONE", voiceId: "V1" });
  const rec = await callShadow({ role: "founder", liveAvatar: "AV_ONE", liveVoice: "V1", liveBy: "role_filter" });
  check("1. single candidate, live==shadow -> agree, drift none", rec.agree === true && rec.drift_class === "none", JSON.stringify(rec.drift_class));
  check("1b. candidate_count=1", rec.candidate_count === 1);
  check("1c. shadow_rule tiebreak_created_at (no markers, sole row)", rec.shadow_rule === "tiebreak_created_at", rec.shadow_rule);
  check("1d. single-candidate agree -> agree_but_multicandidate=false", rec.agree_but_multicandidate === false, JSON.stringify(rec.agree_but_multicandidate));
}

// 1e. agree_but_multicandidate: >1 candidate but shadow==live (storage-order luck).
//     agree stays true and drift_class stays 'none', yet the multi-candidate
//     nondeterminism surface is still flagged true.
await wipe();
{
  const sh = await mkStakeholder("founder");
  // deterministic shadow = oldest created_at => AV_OLD; live happens to match it.
  await mkAvatar({ stakeholder: sh, avatarId: "AV_OLD", createdOffsetSec: 0 });
  await mkAvatar({ stakeholder: sh, avatarId: "AV_NEW", createdOffsetSec: 10 });
  const rec = await callShadow({ role: "founder", liveAvatar: "AV_OLD", liveBy: "role_filter" });
  check("1e. >1 candidate, shadow==live -> agree=true, drift none", rec.agree === true && rec.drift_class === "none", JSON.stringify(rec.drift_class));
  check("1f. >1 candidate, shadow==live -> agree_but_multicandidate=true", rec.agree_but_multicandidate === true, JSON.stringify(rec.agree_but_multicandidate));
  check("1g. candidate_count=2", rec.candidate_count === 2);
}

// 2. ordering_drift: 2 candidates, markers false, live != deterministic shadow
await wipe();
{
  const sh = await mkStakeholder("founder");
  // deterministic shadow = oldest created_at => AV_OLD
  await mkAvatar({ stakeholder: sh, avatarId: "AV_OLD", createdOffsetSec: 0 });
  await mkAvatar({ stakeholder: sh, avatarId: "AV_NEW", createdOffsetSec: 10 });
  const rec = await callShadow({ role: "founder", liveAvatar: "AV_NEW", liveVoice: null, liveBy: "role_filter" });
  check("2. >1 candidate, markers false, shadow(oldest)!=live -> ordering_drift", rec.drift_class === "ordering_drift", rec.drift_class);
  check("2b. shadow picked the OLDEST (AV_OLD), agree=false", rec.shadow_avatar_id === "AV_OLD" && rec.agree === false);
  check("2c. candidate_count=2", rec.candidate_count === 2);
}

// 2d. deterministic order stable across calls (same hash)
{
  const a = await callShadow({ role: "founder", liveAvatar: "AV_NEW" });
  const b = await callShadow({ role: "founder", liveAvatar: "AV_NEW" });
  check("2d. snapshot hash deterministic across calls", a.brand_avatar_snapshot_hash === b.brand_avatar_snapshot_hash);
}

// 3. candidate_empty: no active avatar for the filter -> never raises, records empty
await wipe();
{
  const rec = await callShadow({ role: "ghost", liveAvatar: null, liveVoice: null, liveBy: "fallback_limit1" });
  check("3. empty candidate set -> drift candidate_empty (no raise)", rec.drift_class === "candidate_empty", rec.drift_class);
  check("3b. shadow_rule empty, count 0, agree true (NULL is-not-distinct NULL)", rec.shadow_rule === "empty" && rec.candidate_count === 0 && rec.agree === true);
}

// 4. marker_drift: shadow chooses is_primary, live (no order-by) chose a non-marked row
await wipe();
{
  const sh = await mkStakeholder("founder");
  await mkAvatar({ stakeholder: sh, avatarId: "AV_PLAIN", createdOffsetSec: 0 });
  await mkAvatar({ stakeholder: sh, avatarId: "AV_PRIMARY", primary: true, createdOffsetSec: 10 });
  const rec = await callShadow({ role: "founder", liveAvatar: "AV_PLAIN", liveBy: "role_filter" });
  check("4. shadow chose is_primary, live chose plain -> marker_drift", rec.drift_class === "marker_drift", rec.drift_class);
  check("4b. shadow_avatar AV_PRIMARY, shadow_rule primary", rec.shadow_avatar_id === "AV_PRIMARY" && rec.shadow_rule === "primary");
}

// 5. multi_primary: two is_primary rows -> classified multi_primary (data anomaly)
await wipe();
{
  const sh = await mkStakeholder("founder");
  await mkAvatar({ stakeholder: sh, avatarId: "AV_P1", primary: true, createdOffsetSec: 0 });
  await mkAvatar({ stakeholder: sh, avatarId: "AV_P2", primary: true, createdOffsetSec: 10 });
  const rec = await callShadow({ role: "founder", liveAvatar: "AV_P1" });
  check("5. two is_primary -> multi_primary", rec.drift_class === "multi_primary", rec.drift_class);
}

// 6. input_anomaly: blank render_style
await wipe();
{
  const rec = await callShadow({ role: null, style: "", liveAvatar: null });
  check("6. blank render_style -> input_anomaly", rec.drift_class === "input_anomaly", rec.drift_class);
}

// 7. write-isolation: the function writes ONLY r.avatar_resolution_shadow (never c.brand_avatar)
await wipe();
{
  const sh = await mkStakeholder("founder");
  await mkAvatar({ stakeholder: sh, avatarId: "AV_ISO" });
  const beforeBA = (await one(`SELECT count(*)::int n FROM c.brand_avatar`)).n;
  const beforeBS = (await one(`SELECT count(*)::int n FROM c.brand_stakeholder`)).n;
  const beforeShadow = (await one(`SELECT count(*)::int n FROM r.avatar_resolution_shadow`)).n;
  await callShadow({ role: "founder", liveAvatar: "AV_ISO" });
  const afterBA = (await one(`SELECT count(*)::int n FROM c.brand_avatar`)).n;
  const afterBS = (await one(`SELECT count(*)::int n FROM c.brand_stakeholder`)).n;
  const afterShadow = (await one(`SELECT count(*)::int n FROM r.avatar_resolution_shadow`)).n;
  check("7a. c.brand_avatar row count unchanged (no selection-state write)", beforeBA === afterBA);
  check("7b. c.brand_stakeholder row count unchanged", beforeBS === afterBS);
  check("7c. exactly ONE telemetry row appended", afterShadow === beforeShadow + 1);
}

// 8. tiebreak_id: two candidates, SAME created_at, no markers -> id ASC breaks tie
await wipe();
{
  const sh = await mkStakeholder("founder");
  const idA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const idB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  await db.exec(`SET TIME ZONE 'UTC';`);
  // identical created_at via explicit timestamp
  await one(`INSERT INTO c.brand_avatar (brand_avatar_id,stakeholder_id,client_id,heygen_avatar_id,render_style,is_active,created_at)
    VALUES ($1,$2,$3,'AV_B','realistic',true, timestamptz '2026-01-01 00:00:00+00') RETURNING brand_avatar_id`, [idB, sh, CLIENT]);
  await one(`INSERT INTO c.brand_avatar (brand_avatar_id,stakeholder_id,client_id,heygen_avatar_id,render_style,is_active,created_at)
    VALUES ($1,$2,$3,'AV_A','realistic',true, timestamptz '2026-01-01 00:00:00+00') RETURNING brand_avatar_id`, [idA, sh, CLIENT]);
  const rec = await callShadow({ role: "founder", liveAvatar: "AV_B" });
  check("8. equal created_at, id ASC tiebreak -> picks lowest id (AV_A)", rec.shadow_avatar_id === "AV_A", rec.shadow_avatar_id);
  check("8b. shadow_rule tiebreak_id", rec.shadow_rule === "tiebreak_id", rec.shadow_rule);
}

// 9. grants: service_role has EXECUTE; anon/authenticated/PUBLIC do not
{
  const ex = async (role) => (await one(
    `SELECT has_function_privilege($1, 'public.resolve_and_record_avatar_shadow(uuid,uuid,text,text,text,text,text,uuid)', 'EXECUTE') AS e`,
    [role])).e;
  check("9a. service_role can EXECUTE the rpc", (await ex("service_role")) === true);
  check("9b. anon CANNOT EXECUTE the rpc", (await ex("anon")) === false);
  check("9c. authenticated CANNOT EXECUTE the rpc", (await ex("authenticated")) === false);
  const tIns = async (role) => (await one(
    `SELECT has_table_privilege($1, 'r.avatar_resolution_shadow', 'INSERT') AS e`, [role])).e;
  check("9d. service_role can INSERT telemetry", (await tIns("service_role")) === true);
  check("9e. anon CANNOT INSERT telemetry", (await tIns("anon")) === false);
}

console.log(`\n==== AVATAR SHADOW RESULT: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
