// Validate public.list_active_clients — active-only, names, ordering, empty-safe.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const ROOT = "C:/Users/parve/Invegent-content-engine";
const LIST = readFileSync(`${ROOT}/supabase/migrations/20260613070000_list_active_clients.sql`, "utf8").replace(/\r\n/g, "\n");
const db = new PGlite();
const q = async (sql, p) => (await db.query(sql, p)).rows;
let pass = 0, fail = 0;
const check = (n, c, d = "") => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };

await db.exec(`
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA c;
CREATE TABLE c.client (client_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text NOT NULL DEFAULT 'active');
CREATE TABLE c.client_brand_profile (client_id uuid, brand_name text, is_active boolean DEFAULT true);
`);

await db.exec(LIST);
{
  const r = (await q(`SELECT public.list_active_clients() AS res`))[0].res;
  check("empty roster -> [] (no clients)", Array.isArray(r) && r.length === 0, JSON.stringify(r));
}

// seed: 4 active (1 without brand profile), 1 inactive
await db.exec(`
INSERT INTO c.client (client_id, status) VALUES
 ('11111111-1111-1111-1111-111111111111','active'),
 ('22222222-2222-2222-2222-222222222222','active'),
 ('33333333-3333-3333-3333-333333333333','active'),
 ('44444444-4444-4444-4444-444444444444','active'),
 ('55555555-5555-5555-5555-555555555555','inactive');
INSERT INTO c.client_brand_profile (client_id, brand_name, is_active) VALUES
 ('11111111-1111-1111-1111-111111111111','NDIS Yarns', true),
 ('22222222-2222-2222-2222-222222222222','Property Pulse', true),
 ('33333333-3333-3333-3333-333333333333','Care For Welfare Pty Ltd', true),
 ('55555555-5555-5555-5555-555555555555','Inactive Co', true);
-- client 4 has NO active brand profile -> fallback name
`);
{
  const r = (await q(`SELECT public.list_active_clients() AS res`))[0].res;
  const names = r.map((x) => x.name);
  const ids = r.map((x) => x.id);
  check("returns exactly the 4 active clients (excludes inactive)", r.length === 4, JSON.stringify(names));
  check("inactive client excluded", !ids.includes("55555555-5555-5555-5555-555555555555"));
  check("CFW present", names.includes("Care For Welfare Pty Ltd"));
  check("NY + PP present", names.includes("NDIS Yarns") && names.includes("Property Pulse"));
  check("brand-less active client -> fallback name", names.some((n) => n.startsWith("Client 44444444")));
  check("ordered by name asc", JSON.stringify(names) === JSON.stringify([...names].sort()), JSON.stringify(names));
  check("each row has id + name", r.every((x) => typeof x.id === "string" && typeof x.name === "string"));
}
// grants + read-only
await db.exec(`CREATE SCHEMA IF NOT EXISTS pubcheck;`);
{
  const g = (await q(`SELECT array_agg(grantee::text ORDER BY grantee::text) gr FROM information_schema.routine_privileges WHERE routine_schema='public' AND routine_name='list_active_clients' AND privilege_type='EXECUTE'`))[0].gr;
  check("service_role granted, anon/authenticated not", g.includes('service_role') && !g.includes('anon') && !g.includes('authenticated'), JSON.stringify(g));
  const def = (await q(`SELECT pg_get_functiondef(p.oid) d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='list_active_clients'`))[0].d;
  check("STABLE + SELECT-only (no DML)", /\bSTABLE\b/.test(def) && !/\b(INSERT|UPDATE|DELETE)\b/i.test(def.replace(/--.*$/gm,'')));
}
console.log(`\n==== ROSTER RESULT: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
