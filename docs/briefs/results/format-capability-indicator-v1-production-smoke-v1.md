# Production Smoke Evidence — Format Capability Indicator v1 (read-only, post-hoc)

**Scope:** read-only verification of the live production deployment after discovering it had already shipped without a recorded PK merge/deploy gate (see the process finding in the result doc §10). No code, data, or deployment was changed by this verification.

**Deployment verified:** `invegent-dashboard` project, deployment `dpl_CCSZqZsf8pb5m4cZCaZu9sNkdy7v`, `state: READY`, `target: production`, commit `6f64854` on `main`, created 2026-07-28 20:13 Sydney.

**Method note:** `dashboard.invegent.com` requires app-level email/password sign-in. Per standing safety rules, credentials are never entered on the user's behalf — none were available regardless. A logged-in click-through of the rendered page was therefore not performed. Verification instead combined (a) a direct audit of the exact deployed source at commit `6f64854`, (b) live ground truth from the production database via the same RPC the dashboard calls, and (c) Vercel's runtime-error telemetry for the `/clients` route since deploy. This combination verifies the same behavioral claims a click-through would, without needing an authenticated session.

## 1. Runtime errors since deploy

`get_runtime_errors` (project `prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg`, 7-day window) shows exactly one error group, on `/overview` (`exec_sql error: column "created_at" does not exist`, last seen 2026-07-27 — before this deployment, on an unrelated route/deployment `dpl_BHWE9rUCcAXqwcjEYUuoVB1gKf3B`). **Zero errors attributable to `/clients` or the capability indicator since `dpl_CCSZqZsf8pb5m4cZCaZu9sNkdy7v` went live.**

## 2. Diff scope confirms no execution-behavior change

`git diff --stat` between the prior production commit (`ee02b96`) and the deployed commit (`6f64854`) touches only:

```
actions/format-capability.ts                    | 131 ++
app/(dashboard)/clients/page.tsx                 |  23 +
components/clients/WeekFormatPlanTab.tsx         |  83 +/-
components/format-capability/CapabilityCell.tsx  | 130 ++
lib/format-capability.ts                         | 188 ++
tests/format-capability-*.test.ts (4 files)      | 563 ++
```

No pipeline/resolver/publisher/materialiser file is touched. This is purely additive UI + one new server action; nothing about how a slot is actually rendered or published changed.

## 3. Representative cells — live RPC ground truth vs. rendering logic

Called `public.classify_format_capability` directly (the same RPC `actions/format-capability.ts` calls, service-role) across all 4 live clients (`care-for-welfare-pty-ltd`, `invegent`, `ndis-yarns`, `property-pulse`) × a matrix of platform/format pairs, to find a real example of each render state:

| Status | Example cell | Live evidence |
|---|---|---|
| **Ready** | `care-for-welfare-pty-ltd` / facebook / `image_quote` | `select_template` selected, visually approved |
| **Template missing** | `care-for-welfare-pty-ltd` / linkedin / `video_long_form` | `select_template` fail_reason=`format_unmapped` |
| **Governance unproven** | `care-for-welfare-pty-ltd` / instagram / `video_short_stat` | `select_template` rejected[], reason=`no_assignment` |
| **Unsupported — silent degrade** | `care-for-welfare-pty-ltd` / facebook / `carousel` | fail_closed `select_template` + 1 live publish in the 90-day window |
| **Unknown (fail-closed)** | invalid client_slug (`does-not-exist`) and `NULL` client_slug | classifier itself returns `status:"unknown", reason_code:"client_not_found"` |
| **Asset shortage** | *not found* | no live cell across the combos queried today classifies as `asset_shortage` |
| **Pipeline missing** | *not found* | no live cell across the combos queried today classifies as `pipeline_missing` |

`asset_shortage` and `pipeline_missing` are real statuses the classifier can return (confirmed in source: `lib/format-capability.ts` `CAPABILITY_STATUSES`, and in the classifier's own migration) — they simply have no example among the client/platform/format combinations queried today. This is a coverage gap in today's live data, not a defect in the indicator; not exhaustively fabricated to force a hit.

For every cell above, `actions/format-capability.ts` normalises the RPC's raw jsonb via `normaliseCapabilityPayload` (`lib/format-capability.ts:135`) — it passes `status`/`reason_code`/`routed_lane`/`evidence` through verbatim, fails closed to `unknown` on any malformed or unrecognised payload, and never re-derives or upgrades a blocker category. `CapabilityCell.tsx:74-96` renders exactly that: `label`/`reason`/`lane` sourced directly from the passed-in `CapabilityCellResult`, no client-side re-derivation.

## 4. Behavioral claims — verified by source read

- **Planned formats remain visible / blocked formats are not removed from the schedule:** `WeekFormatPlanTab.tsx:508-609` — the row's `<select>` dropdown is unaffected by capability status (`disabled` is gated only on `selectable.length === 0`, unrelated to capability); a non-ready cell only adds a `Planned — blocked by capability` badge (`WeekFormatPlanTab.tsx:580-587`), gated on `!capabilityReady`. No row is filtered, hidden, or removed based on capability.
- **Status/reason text corresponds to the live RPC:** confirmed above (§3) — the cell renders the RPC's own `status`/`reason_code`/`routed_lane`/`evidence`, never a frontend-invented category.
- **No client other than the selected client is displayed:** `app/(dashboard)/clients/page.tsx:386-389` fetches the capability map keyed solely off `activeClient?.client_slug` (the URL-selected client), and `WeekFormatPlanTab` is keyed `key={activeClientId}` (page.tsx:715) to force a full remount on client switch — no code path fetches or merges another client's capability data into view.
- **No production execution behaviour changed:** confirmed by diff scope (§2) — read-only RPC call added, no writer/pipeline/resolver/publisher code touched, `save()` (the only write path in this tab) is unaffected by the capability addition.

## 5. Verdict

No functional or security defect found. The live deployment matches its own packet/test claims for every check performed. Two of the six named classifier statuses (`asset_shortage`, `pipeline_missing`) have no live example to visually confirm today — noted as a residual verification gap, not a defect, and not grounds to roll back per PK's explicit instruction.
