# Slice A — **ARTIFACT 1 of 2**: read-only DB wrapper packet (`public.get_week_format_allocation`)

**Created:** 2026-07-24 Sydney · **Lane:** S6 · Schedule Slice A (PK priority 1)
**Status:** **AUTHORED, NOT APPLIED.** No DDL executed, no migration filed, no commit, no push.
**Tier:** **T2** (additive, read-only DB object; single new EXECUTE grant; no DML, no DDL on existing objects).
**Canonical ID:** NOT self-allocated. No `cc-` number, no register version claimed.

> **Separation is mandatory (PK).** This packet governs the **database wrapper only**. The dashboard
> code is **artifact 2**, `docs/briefs/slice-a-dashboard-packet-v1.md`, with its **own hash, own review,
> own gate, own rollback**. Do not merge them, do not review them as one, do not apply them as one.
> **Order is fixed: artifact 1 applies first** — artifact 2 renders a red failure block without it.

| Artifact | Path | sha256 | Bytes |
|---|---|---|---|
| **1 — DB wrapper (this packet's subject)** | `docs/briefs/artifacts/slice-a-get-week-format-allocation.sql` | `272f308f66a3b0f3d6893ba23bb75c082afce88b0d8a8a977ff27d78f5db7910` | 20456 |

---

## 0 · Stale-ref gate

| Repo | Upstream (fetched) | Working base | Verdict |
|---|---|---|---|
| CE | `origin/main` | local `main` **ahead 1** (`565540d`, v6.23 registers-only, authored by another session — **not pushed by this lane**) | **Accepted.** `565540d` touched only `docs/00_*` and two result docs; it changed nothing this packet's evidence rests on. |
| `invegent-dashboard` | `origin/main = 524ca6d` | shared checkout `fda2b51` (**5 behind**) — deliberately unused | Facts read via `git show origin/main:` only |

Re-run this gate at the apply gate; `origin/main` may have moved again.

---

## 1 · Why this object exists

The dashboard executes as `service_role` and **cannot call the allocator**. Proven by execution, not by
reading grant tables (`SET ROLE` probe, live, 2026-07-24):

| Probe as `service_role` | Result |
|---|---|
| `m.allocate_week_formats(jsonb,int)` | **42501 permission denied for function** — `proacl = postgres=X/postgres`; PUBLIC's default EXECUTE was revoked in `20260628000000_format_mix_enforcement_phase1.sql` |
| `m.build_weekly_demand_grid(uuid,date)` | **42501 permission denied for schema `t`** — `SECURITY INVOKER`, and its body reads `t.*` where `service_role` holds no `USAGE` |

Ruled out: **not** a PGRST106/exposure problem — schema `m` *is* REST-exposed (203 `.schema('m')` call
sites in CE; live dashboard precedent at `app/(dashboard)/overview/page.tsx:64`). The barrier is
privilege. `postgres` is a *member of* `service_role`, not the reverse, so no inheritance rescues it.

**Rejected alternative:** routing through `public.exec_sql`. It would work (SECURITY DEFINER as
`postgres`) and needs no new object — but it adds a call site to the unremediated injection sink that
cc-0054 is containing. Rejected on posture, and the rejection is recorded in the shipped code comments.

---

## 2 · Control checklist — PK-mandated, item by item

| # | Control | How satisfied | Proof |
|---|---|---|---|
| 1 | Fixed, explicit `search_path` | `SET search_path TO ''` | §P2 executed under `search_path=''` |
| 2 | Fully qualified references | every non-`pg_catalog` object is schema-qualified (`c.client`, `c.client_publish_schedule`, `c.client_publish_profile`, `t."5.3_content_format"`, `m.format_mix_enrolled`, `m.build_weekly_demand_grid`, `m.allocate_week_formats`) | §P2 — an unqualified reference would have thrown under `search_path=''` |
| 3 | **No dynamic SQL** | no `EXECUTE`, no `format()`, no string-built statement | static read of the artifact |
| 4 | **No mutation capability** | `STABLE`; body contains no INSERT/UPDATE/DELETE/TRUNCATE/COPY/DDL/`nextval`/`setval` | static read |
| 5 | **No generic function forwarding** | calls exactly three named functions; no name ever derives from input; no `regprocedure`, no dispatch | static read |
| 6 | Minimal typed inputs, validated | `(uuid, date)` — no string reaches a query. NULL client rejected; unknown client rejected; the date normalises to an ISO Monday and can only drive a fixed 7-day series | §P2 |
| 7 | Minimal output | only what the panel renders. **Deliberately NOT returned:** `client_id`, `client_slug`, `client_status`, `generated_at`, occurrence timestamps, share percentages, the raw grid, the raw `platform_support` map | static read |
| 8 | EXECUTE revoked from PUBLIC | **plus `anon` and `authenticated` named explicitly** | §P4 — proven necessary |
| 9 | EXECUTE granted only to the dashboard role | single `GRANT … TO service_role` | §P1 (post-apply) |
| 10 | Owner pinned | `ALTER FUNCTION … OWNER TO postgres` | §P1 (post-apply) |
| 11 | **Lower-privileged roles cannot invoke** | — | **§P1 — post-apply, script supplied, NOT YET RUN** |
| 12 | **Cannot reach unrelated rows via caller input** | every query filters `client_id = p_client_id` | **§P2 — EXECUTED, passed** |
| 13 | **Fails visibly, never false-empty** | no EXCEPTION handler by design + explicit `allocation_status` | **§P3 — EXECUTED, passed** |

---

## 3 · Proofs

### §P1 — control 11: lower-privileged roles cannot invoke · **POST-APPLY, NOT YET RUN**

Cannot be executed pre-apply without creating the object, and creating it — even inside a rolled-back
transaction — is DDL against production, which is PK's hard stop. **The script is supplied verbatim at
the foot of the artifact** and is mandatory at the apply gate, immediately after the `CREATE`.

Expected: `anon=DENIED[42501]` · `authenticated=DENIED[42501]` · `service_role=OK`, and
`proacl` exactly `postgres=X/postgres | service_role=X/postgres` — no `anon`, no `authenticated`, no
bare `=X/` PUBLIC entry. **Any other result = STOP and roll back.**

The gate must also re-assert the exception widened nothing else:

```sql
SELECT has_schema_privilege('service_role','t','USAGE')                                        -- expect false
     , has_function_privilege('service_role','m.allocate_week_formats(jsonb,integer)','EXECUTE'); -- expect false
```

### §P2 — control 12: caller input cannot reach unrelated rows · **EXECUTED, PASSED**

The wrapper body was run inline as a read-only query, under `SET LOCAL search_path TO ''`, across
**all four** clients that have enabled schedule rows:

| client | rows returned | distinct clients in result | every row belongs to the requested client |
|---|---|---|---|
| `property-pulse` | 20 | **1** | **true** |
| `ndis-yarns` | 20 | **1** | **true** |
| `invegent` | 15 | **1** | **true** |
| `care-for-welfare-pty-ltd` | 15 | **1** | **true** |

The only inputs are a `uuid` and a `date`. Every row-producing query filters `client_id = p_client_id`;
the single unfiltered read is the global format registry `t."5.3_content_format"`, joined on a format key
**derived from the allocator, never from input**. No input reaches a table name, column name, function
name, or `search_path`. Running under `search_path=''` simultaneously proves control 1 and control 2 —
an unqualified reference would have thrown.

### §P3 — control 13: fails visibly, never false-empty · **EXECUTED, PASSED**

The same live run exercised the degraded paths, and produced a materially important finding:

| client | enrolled | `allocation_status` | rendered outcome |
|---|---|---|---|
| `property-pulse` | **true** | `allocated` | the oracle, 6 of 20 invalid |
| `invegent` | false | `not_enrolled_legacy_fallback` | amber banner — allocator not consulted |
| `ndis-yarns` | false | `not_enrolled_legacy_fallback` | amber banner |
| `care-for-welfare-pty-ltd` | false | `not_enrolled_legacy_fallback` | amber banner |

> **`property-pulse` is the ONLY format-mix-enrolled client.** For the other three the allocator is not
> production's path at all. Without the explicit `allocation_status`, those clients would have rendered
> an **empty allocation indistinguishable from a healthy one** — the precise false-empty failure Slice A
> exists to expose. It is now a labelled state, not an absence.

Compounding it: `preferred_format_instagram` / `_linkedin` are **NULL for every client**, so those slots
genuinely receive no format at all and surface as `no_format_assigned` rather than blank.

Design guarantees, both static: there is **no EXCEPTION handler**, so a genuine allocator error
propagates and the dashboard renders its red block; and an unrecognised future `allocation_status`
normalises **away from** `allocated` (unit-tested), so it can never read as healthy.

### §P4 — control 8: why `anon`/`authenticated` must be named · **EXECUTED, PASSED**

`pg_default_acl` for schema `public`, objtype `f`:

```
postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres
```

**Every new `public` function is born EXECUTE-able by `anon` and `authenticated`.** Revoking from
`PUBLIC` alone would leave both grants intact. The explicit revokes are load-bearing, not ceremony.

**Pre-apply baseline** (must still hold after apply — this is what proves the wrapper is the *only*
widening):

```
anon:schema_t=DENIED[42501];          anon:allocator=DENIED[42501];
authenticated:schema_t=DENIED[42501]; authenticated:allocator=DENIED[42501];
service_role:schema_t=DENIED[42501];  service_role:allocator=DENIED[42501];
```

---

## 4 · Fidelity — the wrapper mirrors production, it does not reinvent it

It mirrors `m.materialise_slots`' enrolled-client path exactly. **This is the difference between a panel
that reports and a panel that lies.** The rules, from that function's body:

1. **N = matched-occurrence count** — enabled rows joined to the 7 ISO-week dates on
   `EXTRACT(isodow FROM d) = day_of_week`. *Not* `count(*)` of enabled rows, *not*
   `grid.weekly_slot_count`. **This corrects an error in S6's own earlier packet**, which used the raw
   enabled-row count.
2. Shares from `m.build_weekly_demand_grid(client, monday)`, filtered to the platform, ordered
   `share_pct DESC, ice_format_key ASC`.
3. Ordinal = `row_number()` over occurrence timestamp ascending, in the client's timezone; no
   future-filter, so ordinals are stable across nights.
4. Slot at ordinal receives `assignment[ordinal]`.
5. **Fail-closed to legacy** when not enrolled, grid empty, or N = 0 (YouTube's legacy is the hardcoded
   `video_short_avatar`, matching production).

Also mirrored: `p_week_start` is **accepted and ignored** by the grid (verified via
`pg_get_functiondef`) — the mix is week-independent; only occurrences and ordinals are week-real.

---

## 5 · Sunday — detect and label, never repair

`unmatchable_rows` reports every enabled row whose `day_of_week` matches no isodow, with
`sunday_written_as_zero` distinguished from `day_of_week_out_of_isodow_range`.

The wrapper **does not write, does not activate, and does not rewrite any row**. PK: *"Do not activate or
rewrite them opportunistically."* The 24 disabled Sunday rows stay inert. The repair is S2's packet with
its own gate. Production already excludes these rows from N, so the wrapper reports the same set
production silently drops.

---

## 6 · Gates, stop conditions, rollback

**Gate sequence:** re-run §0 → `db-rls-auditor` (verdict must be `pass`) → external review pinned to
`272f308f66a3b0f3d6893ba23bb75c082afce88b0d8a8a977ff27d78f5db7910` → **PK apply gate (hard stop)** →
PK applies → **§P1 runs immediately** → only then does artifact 2 open its own gate.

**Stop conditions** (any one voids the remainder; resumption needs a fresh PK gate):
artifact hash ≠ `reviewed_input_hash` · `db-rls-auditor` not `pass` · any non-clean external review ·
**§P1 shows `anon` or `authenticated` can invoke** · `proacl` has any grantee beyond `postgres` +
`service_role` · `has_schema_privilege('service_role','t','USAGE')` returns true · any DML/DDL beyond
this one `CREATE FUNCTION` + its grants appears · the file is moved into `supabase/migrations/` before
approval.

**Rollback — single statement, no data touched, no dependents:**

```sql
DROP FUNCTION public.get_week_format_allocation(uuid, date);
```

Validated by construction: the object is additive and read-only, nothing references it in the database,
and the only consumer is artifact 2, which degrades to its designed red failure block. **Rollback is
proven before apply, not after.**

---

## 7 · Non-claims

Does **not** claim: that §P1 has been run (it has not — it is post-apply) · that the object exists (it
does not) · that PK has approved the apply (approval covers authoring under these controls; the apply is
its own gate) · that the dashboard artifact is covered by this packet (it is not — separate hash, review,
gate, rollback) · that `search_path=''` fidelity was proven for the *created function* (it was proven for
the identical body executed inline) · that Slice 2's timing is accounted for here (see artifact 2 §timing).
