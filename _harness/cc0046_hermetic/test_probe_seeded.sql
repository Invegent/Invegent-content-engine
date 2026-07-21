-- cc-0046 hermetic proof — derive_template_vertical + probe_asset_inventory against SEEDED stub tables.
-- Proves Concern-1 (authoritative vertical basis; appetite-vs-template independence; template-tag →
-- family-tag; wrong-vertical exclusion; template_id NULL ⇒ basis unestablished) and Concern-2
-- (platform_scope as a configurable near-match on BOTH client and shared origins).
-- The two functions under test are loaded (extracted from Artifact 1) BEFORE this file.
\set ON_ERROR_STOP on
\pset pager off

create schema if not exists c;
create table c.client(client_id uuid primary key, client_slug text unique);
create table c.client_asset_pool_policy(client_id uuid primary key, pool_policy text,
  allow_vertical_shared boolean, allow_global_shared boolean);
create table c.client_brand_asset(asset_id uuid primary key default gen_random_uuid(),
  client_id uuid, is_active boolean, platform_scope text[], asset_meta jsonb);
create table c.shared_creative_asset(id uuid primary key default gen_random_uuid(),
  asset_kind text, governance_scope text, vertical_key text, platform_scope text[],
  is_active boolean, production_use_allowed boolean, purpose_bound boolean,
  licence_allows_multi_entity_use boolean, allowed_clients uuid[] default '{}', excluded_clients uuid[] default '{}',
  asset_meta jsonb);
create table c.creative_provider_template(id uuid primary key, family_id uuid);
create table c.creative_provider_template_tag(template_id uuid, namespace text, value text);
create table c.creative_template_family_tag(family_id uuid, namespace text, value text);

-- clients
insert into c.client values ('00000000-0000-0000-0000-00000000c1c1','cli');
-- templates: T1 template-tag=ndis; T2 no template-tag but family-tag=realestate; T3 no vertical
insert into c.creative_provider_template values
 ('00000000-0000-0000-0000-00000000a1a1','00000000-0000-0000-0000-00000000b1b1'),
 ('00000000-0000-0000-0000-00000000a2a2','00000000-0000-0000-0000-00000000b2b2'),
 ('00000000-0000-0000-0000-00000000a3a3','00000000-0000-0000-0000-00000000b3b3');
insert into c.creative_provider_template_tag values ('00000000-0000-0000-0000-00000000a1a1','vertical','ndis');
insert into c.creative_template_family_tag values ('00000000-0000-0000-0000-00000000b2b2','vertical','realestate');

\echo '=== derive_template_vertical (the ONE authoritative contract) ==='
select 'T1_template_tag' t, public.derive_template_vertical('00000000-0000-0000-0000-00000000a1a1') d
union all select 'T2_family_tag', public.derive_template_vertical('00000000-0000-0000-0000-00000000a2a2')
union all select 'T3_none',       public.derive_template_vertical('00000000-0000-0000-0000-00000000a3a3')
union all select 'NULL',          public.derive_template_vertical(null);

do $$
declare v jsonb;
begin
  v := public.derive_template_vertical('00000000-0000-0000-0000-00000000a1a1');
  assert v->>'vertical_key'='ndis' and v->>'source'='template_tag', 'T1 vertical';
  v := public.derive_template_vertical('00000000-0000-0000-0000-00000000a2a2');
  assert v->>'vertical_key'='realestate' and v->>'source'='family_tag', 'T2 family fallback';
  v := public.derive_template_vertical('00000000-0000-0000-0000-00000000a3a3');
  assert v->>'vertical_key' is null and v->>'source'='none', 'T3 none';
  v := public.derive_template_vertical(null);
  assert v->>'source'='no_template', 'null template';
  raise notice 'derive_template_vertical: ALL PASS';
end $$;

-- helper to assert a probe result
create or replace function pg_temp.chk(label text, p jsonb, e_total int, e_near int, e_ungov int,
  e_vbasis boolean, e_cov boolean, e_vert text) returns text language plpgsql as $$
begin
  if (p->>'n_inventory_total')::int is distinct from e_total then raise exception '% n_total % <> %', label, p->>'n_inventory_total', e_total; end if;
  if (p->>'n_near_match')::int is distinct from e_near then raise exception '% n_near % <> %', label, p->>'n_near_match', e_near; end if;
  if (p->>'n_existing_ungoverned')::int is distinct from e_ungov then raise exception '% n_ungov % <> %', label, p->>'n_existing_ungoverned', e_ungov; end if;
  if (p->>'vertical_basis_conclusive')::boolean is distinct from e_vbasis then raise exception '% vbasis % <> %', label, p->>'vertical_basis_conclusive', e_vbasis; end if;
  if (p->>'coverage_conclusive')::boolean is distinct from e_cov then raise exception '% coverage % <> %', label, p->>'coverage_conclusive', e_cov; end if;
  if (p->>'resolved_vertical_key') is distinct from e_vert then raise exception '% vert % <> %', label, p->>'resolved_vertical_key', e_vert; end if;
  return label||' PASS (total='||coalesce(p->>'n_inventory_total','?')||' near='||coalesce(p->>'n_near_match','?')||' vert='||coalesce(p->>'resolved_vertical_key','∅')||')';
end $$;

\echo '=== probe scenarios ==='
-- P_ABSENT: no client bg, no relevant shared, template T3 (no vertical) ⇒ genuine absence, basis conclusive
select pg_temp.chk('P_ABSENT', public.probe_asset_inventory('cli','youtube','00000000-0000-0000-0000-00000000a3a3','static_background'),
  0,0,0, true,true, null);

-- P_TEMPLATE_NULL: no candidate template ⇒ basis NOT established ⇒ absent forbidden downstream
select pg_temp.chk('P_TEMPLATE_NULL', public.probe_asset_inventory('cli','youtube',null,'static_background'),
  0,0,0, false,false, null);

-- Seed 1 client bg, fully governed, platform_scope=['facebook'] → Concern-2 client platform near-match on 'youtube'
insert into c.client_brand_asset(client_id,is_active,platform_scope,asset_meta) values
 ('00000000-0000-0000-0000-00000000c1c1', true, array['facebook'],
  '{"usage":"background","approved":"true","license":"stock","bucket":"brand-assets","safe_for_text_overlay":"true"}');
select pg_temp.chk('P_CLIENT_PLATFORM_NEAR', public.probe_asset_inventory('cli','youtube','00000000-0000-0000-0000-00000000a3a3','static_background'),
  1,1,0, true,true, null);
-- same asset, platform 'facebook' ⇒ selectable, NOT near
select pg_temp.chk('P_CLIENT_PLATFORM_OK', public.probe_asset_inventory('cli','facebook','00000000-0000-0000-0000-00000000a3a3','static_background'),
  1,0,0, true,true, null);
delete from c.client_brand_asset;

-- Seed 1 shared global_generic bg governed, platform_scope=['facebook'] → Concern-2 shared platform near-match
insert into c.shared_creative_asset(asset_kind,governance_scope,vertical_key,platform_scope,is_active,production_use_allowed,purpose_bound,licence_allows_multi_entity_use,asset_meta)
 values ('static_background','global_generic',null,array['facebook'],true,true,false,true,'{"safe_for_text_overlay":"true"}');
select pg_temp.chk('P_SHARED_PLATFORM_NEAR', public.probe_asset_inventory('cli','youtube','00000000-0000-0000-0000-00000000a3a3','static_background'),
  1,1,0, true,true, null);
delete from c.shared_creative_asset;

-- WRONG-VERTICAL EXCLUSION (Concern-1 core): template T1 ⇒ authoritative vertical='ndis'.
-- A vertical_shared bg for 'realestate' is a DIFFERENT vertical ⇒ correctly EXCLUDED from the universe.
-- With no other asset ⇒ n_total=0 ⇒ absent — and this is correct because the probe uses the SAME
-- template-derived vertical resolve_slot_assets uses (shared contract), so there is no divergence.
insert into c.shared_creative_asset(asset_kind,governance_scope,vertical_key,platform_scope,is_active,production_use_allowed,purpose_bound,licence_allows_multi_entity_use,asset_meta)
 values ('static_background','vertical_shared','realestate',null,true,true,false,true,'{"safe_for_text_overlay":"true"}');
select pg_temp.chk('P_WRONG_VERTICAL_EXCLUDED', public.probe_asset_inventory('cli','youtube','00000000-0000-0000-0000-00000000a1a1','static_background'),
  0,0,0, true,true, 'ndis');

-- RIGHT-VERTICAL COUNTED (proves the probe uses the TEMPLATE vertical, not any appetite vertical):
-- a vertical_shared 'ndis' bg is in-universe for template T1(ndis). Governed but pool policy does NOT
-- permit vertical_shared ⇒ pool_policy_not_permitted near-match ⇒ counts toward n_total (blocks absent).
insert into c.shared_creative_asset(asset_kind,governance_scope,vertical_key,platform_scope,is_active,production_use_allowed,purpose_bound,licence_allows_multi_entity_use,asset_meta)
 values ('static_background','vertical_shared','ndis',null,true,true,false,true,'{"safe_for_text_overlay":"true"}');
-- (client_only default policy ⇒ vertical_shared not permitted ⇒ the ndis asset is a near-match, realestate still excluded)
select pg_temp.chk('P_RIGHT_VERTICAL_NEAR', public.probe_asset_inventory('cli','youtube','00000000-0000-0000-0000-00000000a1a1','static_background'),
  1,1,0, true,true, 'ndis');
delete from c.shared_creative_asset;

\echo '=== ALL SEEDED PROBE SCENARIOS PASSED (assertions above raised nothing) ==='
