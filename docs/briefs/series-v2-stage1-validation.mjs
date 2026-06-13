// Series v2 Stage 1 validation — additive/inert episode columns + ON DELETE SET NULL.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const ROOT = "C:/Users/parve/Invegent-content-engine";
const SQL = readFileSync(`${ROOT}/supabase/migrations/20260613110000_series_v2_stage1_episode_intent_persona.sql`, "utf8").replace(/\r\n/g, "\n");
const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
let pass = 0, fail = 0;
const check = (n, c, d = "") => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };

// pre-Stage-1 schema (episode table as it exists today + m.creative_intent + c.client)
await db.exec(`
CREATE SCHEMA c; CREATE SCHEMA m;
CREATE TABLE c.client (client_id uuid PRIMARY KEY);
CREATE TABLE m.creative_intent (intent_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid);
CREATE TABLE c.content_series_episode (
  episode_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid, client_id uuid, position int,
  episode_title text, episode_angle text, episode_hook text, cta_type text,
  scheduled_for timestamptz, post_draft_id uuid, status text DEFAULT 'outline',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  recommended_format text, image_headline text, platform_drafts jsonb
);
INSERT INTO c.client VALUES ('11111111-1111-1111-1111-111111111111');
-- existing legacy episodes (mirror the 46 prod rows' shape)
INSERT INTO c.content_series_episode (series_id, client_id, position, episode_title, status, recommended_format, post_draft_id)
SELECT gen_random_uuid(), '11111111-1111-1111-1111-111111111111', g, 'Ep '||g, 'published', 'image_quote', gen_random_uuid()
FROM generate_series(1,5) g;
`);
const before = (await q(`SELECT count(*)::int n FROM c.content_series_episode`))[0].n;

// capture a legacy "existing API" read shape BEFORE migration
const legacyRead = `SELECT episode_id, series_id, position, episode_title, status, recommended_format, post_draft_id, platform_drafts FROM c.content_series_episode ORDER BY position`;
const beforeRows = await q(legacyRead);

// 1. migration applies cleanly
await db.exec(SQL);
check("1. migration applies cleanly", true);

// 2 + 3. existing rows remain valid (count unchanged, all new cols NULL)
const after = (await q(`SELECT count(*)::int n FROM c.content_series_episode`))[0].n;
check("2/3. existing episode rows preserved (count unchanged)", after === before, `${before} -> ${after}`);
const nullCounts = (await q(`SELECT count(*) FILTER (WHERE intent_id IS NOT NULL) i, count(*) FILTER (WHERE persona_label IS NOT NULL) pl, count(*) FILTER (WHERE avatar_preference IS NOT NULL) ap, count(*) FILTER (WHERE persona_notes IS NOT NULL) pn FROM c.content_series_episode`))[0];
check("5. new columns NULL on all existing rows (inert)", Number(nullCounts.i)===0 && Number(nullCounts.pl)===0 && Number(nullCounts.ap)===0 && Number(nullCounts.pn)===0, JSON.stringify(nullCounts));

// 4. existing Series read/API still works (same projection returns same rows)
const afterRows = await q(legacyRead);
check("4. legacy read projection unchanged (existing API still works)", JSON.stringify(beforeRows)===JSON.stringify(afterRows));
// legacy-shaped INSERT (no new columns) still works
const legacyInsert = await q(`INSERT INTO c.content_series_episode (series_id, client_id, position, episode_title, status, recommended_format) VALUES (gen_random_uuid(),'11111111-1111-1111-1111-111111111111',99,'legacy insert','outline','text') RETURNING intent_id, persona_label, avatar_preference, persona_notes`);
check("5b. legacy-shaped INSERT works; new cols default NULL", legacyInsert[0].intent_id===null && legacyInsert[0].persona_label===null && legacyInsert[0].avatar_preference===null && legacyInsert[0].persona_notes===null);

// 6. FK behaviour safe: set intent_id, then delete the intent -> episode survives, intent_id NULL
{
  const ci = (await q(`INSERT INTO m.creative_intent (client_id) VALUES ('11111111-1111-1111-1111-111111111111') RETURNING intent_id`))[0].intent_id;
  const ep = (await q(`SELECT episode_id FROM c.content_series_episode WHERE position=1 LIMIT 1`))[0].episode_id;
  await q(`UPDATE c.content_series_episode SET intent_id=$1, persona_label='Priya', avatar_preference='investor', persona_notes='note' WHERE episode_id=$2`, [ci, ep]);
  check("6a. episode can carry intent_id + persona fields", (await q(`SELECT intent_id, persona_label FROM c.content_series_episode WHERE episode_id=$1`,[ep]))[0].intent_id===ci);
  // bad FK rejected
  let fkRejected = false;
  try { await q(`UPDATE c.content_series_episode SET intent_id='00000000-0000-0000-0000-000000000000' WHERE episode_id=$1`, [ep]); } catch { fkRejected = true; }
  check("6b. FK rejects non-existent intent_id", fkRejected);
  // ON DELETE SET NULL: delete the intent -> episode row survives, intent_id NULL
  await q(`DELETE FROM m.creative_intent WHERE intent_id=$1`, [ci]);
  const ep2 = (await q(`SELECT episode_id, intent_id, persona_label FROM c.content_series_episode WHERE episode_id=$1`, [ep]))[0];
  check("6c. ON DELETE SET NULL: episode survives, intent_id NULL, persona preserved", ep2 && ep2.intent_id===null && ep2.persona_label==='Priya');
}

// index present
check("partial index on intent_id created", (await q(`SELECT count(*)::int n FROM pg_indexes WHERE schemaname='c' AND tablename='content_series_episode' AND indexname='idx_content_series_episode_intent_id'`))[0].n===1);

// 8. no function/RPC created or changed by this migration
check("8. no functions created (additive DDL only)", (await q(`SELECT count(*)::int n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname IN ('c','m','public')`))[0].n===0);

// 7. rollback simple: drop index + columns -> back to original shape
const preRollback = (await q(`SELECT count(*)::int n FROM c.content_series_episode`))[0].n;
await db.exec(`
DROP INDEX IF EXISTS c.idx_content_series_episode_intent_id;
ALTER TABLE c.content_series_episode DROP COLUMN IF EXISTS persona_notes;
ALTER TABLE c.content_series_episode DROP COLUMN IF EXISTS avatar_preference;
ALTER TABLE c.content_series_episode DROP COLUMN IF EXISTS persona_label;
ALTER TABLE c.content_series_episode DROP COLUMN IF EXISTS intent_id;
`);
const cols = (await q(`SELECT string_agg(column_name,',' ORDER BY ordinal_position) c FROM information_schema.columns WHERE table_schema='c' AND table_name='content_series_episode'`))[0].c;
check("7. rollback drops cleanly; episodes intact; no new cols remain", !cols.includes('intent_id') && !cols.includes('persona_label') && !cols.includes('avatar_preference') && !cols.includes('persona_notes') && (await q(`SELECT count(*)::int n FROM c.content_series_episode`))[0].n===preRollback);

console.log(`\n==== SERIES V2 STAGE 1 RESULT: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
