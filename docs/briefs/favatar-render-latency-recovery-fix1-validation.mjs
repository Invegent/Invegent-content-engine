// F-AVATAR-RENDER-LATENCY-RECOVERY Fix 1 validation — gate/release add video_short_avatar.
// Loads the REAL migration SQL (the two redefined functions), binds the prod triggers,
// and exercises the 5 required cases. Pure logic / rollback test, no prod touch.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const ROOT = "C:/Users/parve/Invegent-content-engine";
const MIG = readFileSync(`${ROOT}/supabase/migrations/favatar_render_latency_recovery_fix1_gate_release_add_avatar.sql`, "utf8").replace(/\r\n/g, "\n");
const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
let pass = 0, fail = 0;
const check = (n, c, d = "") => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const minsFromNow = async (ts) => Number((await one(`SELECT EXTRACT(epoch FROM ($1::timestamptz - now()))/60.0 AS m`, [ts])).m);

// ── minimal prod surface ─────────────────────────────────────────────────────
await db.exec(`
CREATE SCHEMA m;
CREATE TABLE m.slot (slot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scheduled_publish_at timestamptz);
CREATE TABLE m.post_draft (
  post_draft_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slot_id uuid,
  recommended_format text, image_status text, video_status text, scheduled_for timestamptz);
CREATE TABLE m.post_publish_queue (
  queue_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_draft_id uuid,
  status text, scheduled_for timestamptz, created_at timestamptz DEFAULT now());
`);
// real redefined functions (from the migration), then bind the prod triggers
await db.exec(MIG);
await db.exec(`
CREATE TRIGGER trg_gate_queue_on_asset_status BEFORE INSERT ON m.post_publish_queue
  FOR EACH ROW EXECUTE FUNCTION m.gate_queue_on_asset_status();
CREATE TRIGGER trg_release_queue_on_asset_ready AFTER UPDATE OF image_status, video_status ON m.post_draft
  FOR EACH ROW EXECUTE FUNCTION m.release_queue_on_asset_ready();
`);

// helper: make a draft + slot, return ids
async function mkDraft(fmt, { image_status=null, video_status=null, draft_sched=null, slot_off_min=null } = {}) {
  const slot = (await one(`INSERT INTO m.slot (scheduled_publish_at) VALUES (CASE WHEN $1::int IS NULL THEN NULL ELSE now()+($1||' minutes')::interval END) RETURNING slot_id`, [slot_off_min])).slot_id;
  const d = (await one(`INSERT INTO m.post_draft (slot_id, recommended_format, image_status, video_status, scheduled_for)
    VALUES ($1,$2,$3,$4, CASE WHEN $5::int IS NULL THEN NULL ELSE now()+($5||' minutes')::interval END) RETURNING post_draft_id`,
    [slot, fmt, image_status, video_status, draft_sched])).post_draft_id;
  return { slot, d };
}
// queue insert (gate fires BEFORE INSERT); requested scheduled_for = now + off min
async function enqueue(draftId, offMin, status='queued') {
  return (await one(`INSERT INTO m.post_publish_queue (post_draft_id, status, scheduled_for)
    VALUES ($1,$2, now()+($3||' minutes')::interval) RETURNING queue_id, scheduled_for`, [draftId, status, offMin])).queue_id;
}
const qsched = async (qid) => (await one(`SELECT scheduled_for FROM m.post_publish_queue WHERE queue_id=$1`,[qid])).scheduled_for;

console.log("\n== F-AVATAR-RENDER-LATENCY-RECOVERY Fix 1 ==");

// 0. confirm video_short_avatar present in both lists (and only lists changed is asserted separately)
check("0. migration appends video_short_avatar to exactly the 2 video IN-lists",
  (MIG.match(/_voice','video_short_avatar'\)/g) || []).length === 2);

// 1. avatar PENDING -> queue held (+4h) by the gate on INSERT
{
  const { d } = await mkDraft('video_short_avatar', { video_status: 'pending' });
  const qid = await enqueue(d, 5);                  // requested 5 min out
  const m = await minsFromNow(await qsched(qid));
  check("1. avatar pending -> queue held ~+4h (gate)", m >= 235 && m <= 245, `${Math.round(m)}m`);
}

// 2. avatar GENERATED -> held/future row released to intended time (preserve schedule)
{
  // intended publish = slot at +120m; held queue row at +240m; draft video pending
  const { d } = await mkDraft('video_short_avatar', { video_status: 'pending', slot_off_min: 120 });
  const qid = (await one(`INSERT INTO m.post_publish_queue (post_draft_id,status,scheduled_for) VALUES ($1,'queued', now()+interval '240 minutes') RETURNING queue_id`,[d])).queue_id;
  await q(`UPDATE m.post_draft SET video_status='generated' WHERE post_draft_id=$1`, [d]);  // release trigger
  const m = await minsFromNow(await qsched(qid));
  check("2. avatar generated -> released to intended slot time (~+120m, not +240 hold, not now)", m >= 115 && m <= 125, `${Math.round(m)}m`);
}

// 2b. avatar generated, intended time in the PAST -> released to ~now (GREATEST with now)
{
  const { d } = await mkDraft('video_short_avatar', { video_status: 'pending', slot_off_min: -60 }); // intended 60m ago
  const qid = (await one(`INSERT INTO m.post_publish_queue (post_draft_id,status,scheduled_for) VALUES ($1,'queued', now()+interval '240 minutes') RETURNING queue_id`,[d])).queue_id;
  await q(`UPDATE m.post_draft SET video_status='generated' WHERE post_draft_id=$1`, [d]);
  const m = await minsFromNow(await qsched(qid));
  check("2b. avatar generated, past intent -> released to ~now (GREATEST(past,now))", m >= -2 && m <= 2, `${Math.round(m)}m`);
}

// 3. non-avatar video (kinetic) behaviour UNCHANGED
{
  const { d } = await mkDraft('video_short_kinetic', { video_status: 'pending', slot_off_min: 120 });
  const qid = await enqueue(d, 5);
  check("3a. kinetic pending -> held ~+4h", (await minsFromNow(await qsched(qid))) >= 235);
  const qid2 = (await one(`INSERT INTO m.post_publish_queue (post_draft_id,status,scheduled_for) VALUES ($1,'queued', now()+interval '240 minutes') RETURNING queue_id`,[d])).queue_id;
  await q(`UPDATE m.post_draft SET video_status='generated' WHERE post_draft_id=$1`, [d]);
  const m = await minsFromNow(await qsched(qid2));
  check("3b. kinetic generated -> released to intended (~+120m)", m >= 115 && m <= 125, `${Math.round(m)}m`);
}

// 4. image (image_quote) behaviour UNCHANGED
{
  const { d } = await mkDraft('image_quote', { image_status: 'pending', slot_off_min: 90 });
  const qid = await enqueue(d, 5);
  check("4a. image pending -> held ~+4h", (await minsFromNow(await qsched(qid))) >= 235);
  const qid2 = (await one(`INSERT INTO m.post_publish_queue (post_draft_id,status,scheduled_for) VALUES ($1,'queued', now()+interval '240 minutes') RETURNING queue_id`,[d])).queue_id;
  await q(`UPDATE m.post_draft SET image_status='generated' WHERE post_draft_id=$1`, [d]);
  const m = await minsFromNow(await qsched(qid2));
  check("4b. image generated -> released to intended (~+90m)", m >= 85 && m <= 95, `${Math.round(m)}m`);
}

// 5. existing failed/skipped + non-held rows NOT touched on avatar release
{
  const { d } = await mkDraft('video_short_avatar', { video_status: 'pending', slot_off_min: 120 });
  // (a) a FAILED queue row, future-scheduled
  const failedQ = (await one(`INSERT INTO m.post_publish_queue (post_draft_id,status,scheduled_for) VALUES ($1,'failed', now()+interval '240 minutes') RETURNING queue_id`,[d])).queue_id;
  const failedBefore = await qsched(failedQ);
  // (b) a SKIPPED queue row
  const skipQ = (await one(`INSERT INTO m.post_publish_queue (post_draft_id,status,scheduled_for) VALUES ($1,'skipped', now()+interval '240 minutes') RETURNING queue_id`,[d])).queue_id;
  const skipBefore = await qsched(skipQ);
  // (c) a queued row that is NOT held (scheduled_for <= now+30min) -> outside the guard.
  //     (the BEFORE-INSERT gate would hold a pending-asset row to +4h, so set the
  //      near-term schedule via UPDATE — gate is INSERT-only — to model a non-held row.)
  const soonQ = (await one(`INSERT INTO m.post_publish_queue (post_draft_id,status,scheduled_for) VALUES ($1,'queued', now()+interval '10 minutes') RETURNING queue_id`,[d])).queue_id;
  await q(`UPDATE m.post_publish_queue SET scheduled_for = now()+interval '10 minutes' WHERE queue_id=$1`, [soonQ]);
  const soonBefore = await qsched(soonQ);
  await q(`UPDATE m.post_draft SET video_status='generated' WHERE post_draft_id=$1`, [d]);  // release fires
  check("5a. failed queue row untouched", String(await qsched(failedQ)) === String(failedBefore));
  check("5b. skipped queue row untouched", String(await qsched(skipQ)) === String(skipBefore));
  check("5c. non-held queued row (<=now+30m) untouched", String(await qsched(soonQ)) === String(soonBefore));
}

// 6. image-list NOT widened (avatar must NOT be treated as an image format) — structural
check("6. image-format lists unchanged (no video_short_avatar in image IN-list)",
  !/IN \('image_quote','carousel','animated_text_reveal','animated_data','video_short_avatar'/.test(MIG));

console.log(`\n==== AVATAR GATE/RELEASE RESULT: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
