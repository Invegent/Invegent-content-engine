// Validate public.get_studio_capabilities — matrix states for NY/PP/CFW/Invegent (brief §8).
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const ROOT = "C:/Users/parve/Invegent-content-engine";
const SQL = readFileSync(`${ROOT}/supabase/migrations/20260613090000_get_studio_capabilities.sql`, "utf8").replace(/\r\n/g, "\n");
const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
let pass = 0, fail = 0;
const check = (n, c, d = "") => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };

await db.exec(`
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA c; CREATE SCHEMA t; CREATE SCHEMA m;
CREATE TABLE c.client_publish_profile (client_id uuid, platform text, publish_enabled boolean DEFAULT true, status text DEFAULT 'active');
CREATE TABLE t."5.3_content_format" (ice_format_key text, is_active boolean DEFAULT true, is_buildable boolean,
  requires_build boolean, render_engine text, platform_support jsonb, advisor_description text);
CREATE TABLE m.post_draft (post_draft_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recommended_format text);
CREATE TABLE m.post_publish (post_publish_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_draft_id uuid,
  status text, platform text, published_at timestamptz);

-- real taxonomy platform_support
INSERT INTO t."5.3_content_format" (ice_format_key, is_buildable, requires_build, render_engine, platform_support, advisor_description) VALUES
 ('animated_data', true, false, 'creatomate', '{"facebook":true,"linkedin":false,"instagram":true}', 'stat gif'),
 ('animated_text_reveal', true, false, 'creatomate', '{"facebook":true,"linkedin":false,"instagram":true}', 'text gif'),
 ('carousel', true, false, 'creatomate', '{"facebook":true,"linkedin":true,"instagram":true}', 'carousel'),
 ('image_quote', true, false, 'creatomate', '{"facebook":true,"linkedin":true,"instagram":true}', 'image'),
 ('text', true, false, 'none', '{"facebook":true,"linkedin":true,"instagram":false}', 'text'),
 ('video_long_explainer', false, true, 'creatomate+elevenlabs', '{"youtube":true,"facebook":false}', 'long'),
 ('video_long_podcast_clip', false, true, 'creatomate', '{"youtube":true,"facebook":true}', 'podcast'),
 ('video_short', false, true, 'creatomate+elevenlabs', '{"youtube":true,"facebook":true,"linkedin":false,"instagram":true}', 'legacy short'),
 ('video_short_avatar', true, true, 'heygen', '{"youtube":true,"facebook":true,"linkedin":true,"instagram":true}', 'avatar'),
 ('video_short_kinetic', true, false, 'creatomate', '{"youtube":true,"facebook":true,"linkedin":false,"instagram":false}', 'kinetic'),
 ('video_short_kinetic_voice', true, false, 'creatomate+elevenlabs', '{"youtube":true,"facebook":true}', 'kinetic voice'),
 ('video_short_stat', true, false, 'creatomate', '{"youtube":true,"facebook":true,"linkedin":false,"instagram":false}', 'stat'),
 ('video_short_stat_voice', true, false, 'creatomate+elevenlabs', '{"youtube":true,"facebook":true}', 'stat voice'),
 (NULL, false, false, NULL, NULL, '');  -- null-key row (newsletter/reddit class) must be excluded

-- eligibility: CFW/Invegent FB+IG+LI; NY/PP +YT
INSERT INTO c.client_publish_profile (client_id, platform) VALUES
 ('3eca32aa-e460-462f-a846-3f6ace6a3cae','facebook'),('3eca32aa-e460-462f-a846-3f6ace6a3cae','instagram'),('3eca32aa-e460-462f-a846-3f6ace6a3cae','linkedin'),
 ('93494a09-cc89-41d1-b364-cb63983063a6','facebook'),('93494a09-cc89-41d1-b364-cb63983063a6','instagram'),('93494a09-cc89-41d1-b364-cb63983063a6','linkedin'),
 ('fb98a472-ae4d-432d-8738-2273231c1ef4','facebook'),('fb98a472-ae4d-432d-8738-2273231c1ef4','instagram'),('fb98a472-ae4d-432d-8738-2273231c1ef4','linkedin'),('fb98a472-ae4d-432d-8738-2273231c1ef4','youtube'),
 ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','facebook'),('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','instagram'),('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','linkedin'),('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','youtube');
`);

// seed proven rows (global; representative of the real 90d matrix)
const proven = [
  ["facebook","text"],["facebook","image_quote"],["facebook","carousel"],["facebook","video_short_kinetic"],["facebook","video_short_stat"],
  ["linkedin","text"],["linkedin","image_quote"],["linkedin","carousel"],["linkedin","video_short_kinetic_voice"],["linkedin","video_short_stat_voice"],
  ["instagram","image_quote"],["instagram","carousel"],
  ["youtube","video_short_kinetic"],["youtube","video_short_stat"],["youtube","video_short_avatar"],["youtube","video_short_kinetic_voice"],["youtube","video_short_stat_voice"],
];
for (const [plat, fmt] of proven) {
  const d = (await q(`INSERT INTO m.post_draft (recommended_format) VALUES ($1) RETURNING post_draft_id`, [fmt]))[0].post_draft_id;
  await q(`INSERT INTO m.post_publish (post_draft_id, status, platform, published_at) VALUES ($1,'published',$2, now()-interval '5 days')`, [d, plat]);
}
await db.exec(SQL);

const CL = { CFW:"3eca32aa-e460-462f-a846-3f6ace6a3cae", INV:"93494a09-cc89-41d1-b364-cb63983063a6", NY:"fb98a472-ae4d-432d-8738-2273231c1ef4", PP:"4036a6b5-b4a3-406e-998d-c2fe14a8bbdd" };
const cap = async (id) => (await q(`SELECT public.get_studio_capabilities($1) AS r`, [id]))[0].r;
function plats(c) { return (c.platforms||[]).map(p=>p.platform).sort(); }
function fstate(c, platform, format) {
  const p = (c.platforms||[]).find(x=>x.platform===platform); if(!p) return "<no-platform>";
  const f = (p.formats||[]).find(x=>x.format===format); return f ? f.state : "<no-format>";
}
function freason(c, platform, format) {
  const p = (c.platforms||[]).find(x=>x.platform===platform); const f = p&&(p.formats||[]).find(x=>x.format===format); return f?f.reason:null;
}

console.log("Eligibility (§8.1)");
const ny = await cap(CL.NY), cfw = await cap(CL.CFW), inv = await cap(CL.INV), pp = await cap(CL.PP);
check("NY platforms = fb/ig/li/yt", JSON.stringify(plats(ny))===JSON.stringify(["facebook","instagram","linkedin","youtube"]), JSON.stringify(plats(ny)));
check("CFW platforms = fb/ig/li (no yt)", JSON.stringify(plats(cfw))===JSON.stringify(["facebook","instagram","linkedin"]), JSON.stringify(plats(cfw)));
check("Invegent platforms = fb/ig/li (no yt)", JSON.stringify(plats(inv))===JSON.stringify(["facebook","instagram","linkedin"]));
check("PP platforms = fb/ig/li/yt", JSON.stringify(plats(pp))===JSON.stringify(["facebook","instagram","linkedin","youtube"]));

console.log("\nLinkedIn (§8.2 + LI-video taxonomy-governed)");
check("LI text enabled", fstate(cfw,"linkedin","text")==="enabled");
check("LI image_quote enabled (was wrongly disabled)", fstate(cfw,"linkedin","image_quote")==="enabled");
check("LI carousel enabled", fstate(cfw,"linkedin","carousel")==="enabled");
check("LI video_short_avatar enabled_unproven (linkedin:true, 0 proven)", fstate(cfw,"linkedin","video_short_avatar")==="enabled_unproven", fstate(cfw,"linkedin","video_short_avatar"));
check("LI video_short_kinetic_voice DISABLED (taxonomy linkedin:false; escalated)", fstate(cfw,"linkedin","video_short_kinetic_voice")==="disabled", fstate(cfw,"linkedin","video_short_kinetic_voice"));
check("LI kinetic_voice disabled reason mentions linkedin", (freason(cfw,"linkedin","video_short_kinetic_voice")||"").includes("linkedin"));
check("LI kinetic disabled", fstate(cfw,"linkedin","video_short_kinetic")==="disabled");

console.log("\nInstagram (§8.3)");
check("IG image_quote enabled", fstate(cfw,"instagram","image_quote")==="enabled");
check("IG carousel enabled", fstate(cfw,"instagram","carousel")==="enabled");
check("IG text HIDDEN (support false + render none)", fstate(cfw,"instagram","text")==="hidden", fstate(cfw,"instagram","text"));
check("IG kinetic DISABLED-with-reason (support false, not video-only)", fstate(cfw,"instagram","video_short_kinetic")==="disabled", fstate(cfw,"instagram","video_short_kinetic"));
check("IG stat disabled", fstate(cfw,"instagram","video_short_stat")==="disabled");
check("IG avatar enabled_unproven", fstate(cfw,"instagram","video_short_avatar")==="enabled_unproven");

console.log("\nYouTube (§8.4 video-only)");
check("YT video_short_kinetic enabled", fstate(ny,"youtube","video_short_kinetic")==="enabled");
check("YT video_short_avatar enabled", fstate(ny,"youtube","video_short_avatar")==="enabled");
check("YT text HIDDEN (video-only platform)", fstate(ny,"youtube","text")==="hidden", fstate(ny,"youtube","text"));
check("YT image_quote HIDDEN (video-only)", fstate(ny,"youtube","image_quote")==="hidden");
check("YT carousel HIDDEN (video-only)", fstate(ny,"youtube","carousel")==="hidden");
const ytp = (ny.platforms||[]).find(p=>p.platform==="youtube");
check("YT video_only flag true", ytp && ytp.video_only===true);

console.log("\nUnproven badge (§8.5)");
check("FB animated_data enabled_unproven (support true, 0 proven)", fstate(cfw,"facebook","animated_data")==="enabled_unproven", fstate(cfw,"facebook","animated_data"));
check("FB animated_text_reveal enabled_unproven", fstate(cfw,"facebook","animated_text_reveal")==="enabled_unproven");
check("FB video_short_avatar enabled_unproven (proven on YT only)", fstate(cfw,"facebook","video_short_avatar")==="enabled_unproven", fstate(cfw,"facebook","video_short_avatar"));
check("FB text enabled (proven)", fstate(cfw,"facebook","text")==="enabled");

console.log("\nNot-buildable / excluded (§8.6)");
check("video_long_explainer hidden (not buildable)", fstate(ny,"youtube","video_long_explainer")==="hidden");
check("video_short (legacy) hidden (not buildable)", fstate(cfw,"facebook","video_short")==="hidden");
// null-key row never appears as a format
const anyNull = (cfw.platforms||[]).some(p=>(p.formats||[]).some(f=>f.format===null));
check("null-key format excluded everywhere", !anyNull);
// newsletter/reddit never appear as platforms (no profile)
check("no newsletter/reddit platform", !plats(cfw).includes("newsletter") && !plats(cfw).includes("reddit"));

console.log("\nProven count surfaced + grants/read-only");
const fbText = (cfw.platforms.find(p=>p.platform==="facebook").formats.find(f=>f.format==="text"));
check("proven_count surfaced (FB text >0)", fbText.proven_count > 0 && fbText.proven === true);
check("LI kinetic_voice proven_count surfaced even though disabled", (cfw.platforms.find(p=>p.platform==="linkedin").formats.find(f=>f.format==="video_short_kinetic_voice")).proven_count > 0);
{
  const g = (await q(`SELECT array_agg(grantee::text ORDER BY grantee::text) gr FROM information_schema.routine_privileges WHERE routine_schema='public' AND routine_name='get_studio_capabilities' AND privilege_type='EXECUTE'`))[0].gr;
  check("service_role only (no anon/authenticated)", g.includes('service_role') && !g.includes('anon') && !g.includes('authenticated'), JSON.stringify(g));
  const def = (await q(`SELECT pg_get_functiondef(p.oid) d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_studio_capabilities'`))[0].d;
  check("STABLE + SELECT-only (no DML)", /\bSTABLE\b/.test(def) && !/\b(INSERT|UPDATE|DELETE)\b/i.test(def.replace(/--.*$/gm,'').replace(/'[^']*'/g,"''")));
}
// unknown/empty client -> [] safe
check("unknown client -> empty platforms", JSON.stringify((await cap('00000000-0000-0000-0000-000000000000')).platforms)==="[]");

console.log(`\n==== CAPABILITIES RESULT: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
