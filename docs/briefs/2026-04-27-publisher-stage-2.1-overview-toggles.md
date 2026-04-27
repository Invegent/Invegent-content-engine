# Brief: Publisher Observability Stage 2.1 — Per-platform toggles on Overview

**Date:** 27 April 2026
**Track:** Concrete-the-pipeline / Section 2: Publisher Observability
**Stage:** 2.1 (first of 5)
**Gate B status:** Safe — touches `c.client_publish_profile` UI surface only, no pipeline state
**Estimated effort:** 3 hours CC + 30 min PK verification

---

## Why this stage exists

Today's publishing audit identified that 4 of 13 client × platform rows have `c.client_publish_profile.mode = NULL`, which silently blocks the publisher from picking up queue items. PK has no way to discover or fix this without running SQL. The Overview tab on `/clients` displays a "— Mode" badge for these rows but provides no way to set it.

The same pattern exists for `r6_enabled` (false for CFW + Invegent, true for NDIS-Yarns + Property Pulse — completely invisible in UI), `publish_enabled` (toggleable nowhere), and `auto_approve_enabled` (visible on Overview but not editable).

This stage exposes these four boolean/text controls per client × platform on the Overview tab. No new tables, no schema changes — every column already exists.

## Stage scope

### What this stage delivers

1. **RPC:** `public.update_publish_profile_toggle(p_client_id UUID, p_platform TEXT, p_field TEXT, p_value JSONB)` — `SECURITY DEFINER`, validates field is one of (`mode`, `r6_enabled`, `publish_enabled`, `auto_approve_enabled`), validates value type, updates row, returns updated row state.
2. **Frontend:** Replace read-only badges on the Overview tab with interactive toggles. Mode = 3-option button group (auto/manual/staging). The 3 booleans = clickable pill toggles.
3. **Optimistic UI:** Toggle clicks update immediately, then call the RPC, with rollback on error. Same pattern as the Discovery form (Lesson #33).
4. **Audit row:** Each toggle write inserts to a new `c.client_publish_profile_audit` table with `(client_id, platform, field, old_value, new_value, changed_by, changed_at)`.

### What this stage does NOT do

- Does NOT fix the 4 NULL `mode` rows automatically — PK does that via the new UI, deliberately, after seeing them.
- Does NOT add controls for `paused_until` / `paused_reason` (different UX pattern, separate stage if needed).
- Does NOT add controls for `image_generation_enabled` / `video_generation_enabled` (out of scope, leave as read-only badges).
- Does NOT add Instagram per-client enablement (Stage 2.5 territory — IG has cron-level + per-client gating, needs investigation first).
- Does NOT change publisher Edge Function behaviour. The RPC writes; the publisher already reads `mode` correctly.
- Does NOT do anything with the audit table beyond inserts — surfacing audit history is a future stage if PK wants it.

---

## Pre-flight queries (Lesson #32)

CC must run all four and confirm before touching any code.

```sql
-- PF1: Confirm c.client_publish_profile column types and nullability
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'c' AND table_name = 'client_publish_profile'
  AND column_name IN ('mode', 'publish_enabled', 'r6_enabled', 'auto_approve_enabled');
-- Expect:
--   mode: text, YES nullable, default null
--   publish_enabled: boolean, YES nullable, default null
--   r6_enabled: boolean, NO nullable, default false
--   auto_approve_enabled: boolean, NO nullable, default false

-- PF2: Confirm there is NO check constraint on `mode` (RPC must enforce allowed values)
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class cl ON cl.oid = con.conrelid
JOIN pg_namespace n ON n.oid = cl.relnamespace
WHERE n.nspname = 'c' AND cl.relname = 'client_publish_profile' AND con.contype = 'c';
-- Expect: 0 rows. If non-zero, brief assumption is wrong — STOP and update.

-- PF3: Confirm primary key shape on c.client_publish_profile
SELECT a.attname
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
JOIN pg_class cl ON cl.oid = i.indrelid
JOIN pg_namespace n ON n.oid = cl.relnamespace
WHERE n.nspname = 'c' AND cl.relname = 'client_publish_profile' AND i.indisprimary;
-- Expect: client_publish_profile_id (single PK)

-- PF4: Confirm uniqueness of (client_id, platform) for upsert/lookup safety
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class cl ON cl.oid = con.conrelid
JOIN pg_namespace n ON n.oid = cl.relnamespace
WHERE n.nspname = 'c' AND cl.relname = 'client_publish_profile' AND con.contype = 'u';
-- Expect: at least one UNIQUE constraint covering (client_id, platform).
-- If absent, the RPC needs to update by client_publish_profile_id passed in; plan B documented in RPC spec.
```

If any pre-flight result deviates from "expect", STOP and update the brief.

---

## Acceptance criteria

This stage is done when ALL of these are true:

- [ ] Migration applied creating `c.client_publish_profile_audit` table.
- [ ] Migration applied creating `public.update_publish_profile_toggle` RPC.
- [ ] RPC rejects invalid field names with clear error (`p_field` must be in allowed set).
- [ ] RPC rejects invalid `mode` values (`'auto'`, `'manual'`, `'staging'` only — but NULL allowed for `mode` only).
- [ ] RPC rejects non-boolean values for the 3 boolean fields.
- [ ] RPC writes one row to audit table per successful toggle.
- [ ] Overview tab on `/clients` shows the 4 toggles per platform per client.
- [ ] Toggle click optimistically updates the UI, calls RPC, on error reverts and shows toast.
- [ ] PK can navigate to CFW Overview, change CFW Facebook mode from `—` to `auto`, see the change reflected immediately and persisted on page reload.
- [ ] Existing badges that aren't toggleable in this stage (Images, Video, Token) remain read-only and unchanged.
- [ ] No regressions: NDIS-Yarns and Property Pulse mode stays `auto`, all existing rows untouched except via deliberate clicks.

---

## Migration 1 — audit table

File: `supabase/migrations/20260428_003_section_2_stage_1_audit_table.sql`

```sql
-- Stage 2.1 — audit trail for publish profile toggle changes
-- Append-only. Never updated, never deleted in normal operation.

CREATE TABLE IF NOT EXISTS c.client_publish_profile_audit (
  audit_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
  platform          text NOT NULL,
  field             text NOT NULL,
  old_value         jsonb,
  new_value         jsonb,
  changed_by        text NOT NULL DEFAULT 'dashboard',
  changed_at        timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_publish_profile_audit_client_platform
  ON c.client_publish_profile_audit (client_id, platform, changed_at DESC);

COMMENT ON TABLE c.client_publish_profile_audit IS
  'Append-only audit of toggle changes on c.client_publish_profile. Stage 2.1 deliverable.';
```

---

## Migration 2 — RPC

File: `supabase/migrations/20260428_004_section_2_stage_1_toggle_rpc.sql`

```sql
-- Stage 2.1 — RPC for per-platform publisher profile toggles from dashboard

CREATE OR REPLACE FUNCTION public.update_publish_profile_toggle(
  p_client_id  uuid,
  p_platform   text,
  p_field      text,
  p_value      jsonb,
  p_changed_by text DEFAULT 'dashboard'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, c
AS $$
DECLARE
  v_allowed_fields text[] := ARRAY['mode', 'publish_enabled', 'r6_enabled', 'auto_approve_enabled'];
  v_allowed_modes  text[] := ARRAY['auto', 'manual', 'staging'];
  v_old_value      jsonb;
  v_updated_count  int;
BEGIN
  -- Validate field is in allowed set
  IF NOT (p_field = ANY(v_allowed_fields)) THEN
    RAISE EXCEPTION 'Field % not allowed. Allowed fields: %', p_field, v_allowed_fields;
  END IF;

  -- Validate value shape per field
  IF p_field = 'mode' THEN
    -- mode allows NULL or one of three text values
    IF p_value IS NOT NULL
       AND jsonb_typeof(p_value) != 'null'
       AND NOT (
         jsonb_typeof(p_value) = 'string'
         AND (p_value #>> '{}') = ANY(v_allowed_modes)
       )
    THEN
      RAISE EXCEPTION 'Invalid mode value: %. Allowed: %, or null', p_value, v_allowed_modes;
    END IF;
  ELSE
    -- the 3 boolean fields require boolean
    IF p_value IS NULL OR jsonb_typeof(p_value) != 'boolean' THEN
      RAISE EXCEPTION 'Field % requires a boolean value, got %', p_field, jsonb_typeof(p_value);
    END IF;
  END IF;

  -- Validate target row exists
  IF NOT EXISTS (
    SELECT 1 FROM c.client_publish_profile
    WHERE client_id = p_client_id AND platform = p_platform
  ) THEN
    RAISE EXCEPTION 'No publish profile found for client % on platform %', p_client_id, p_platform;
  END IF;

  -- Capture old value for audit
  EXECUTE format(
    'SELECT to_jsonb(%I) FROM c.client_publish_profile WHERE client_id = $1 AND platform = $2',
    p_field
  ) INTO v_old_value USING p_client_id, p_platform;

  -- Apply update — dynamic SQL because column name is parameter
  IF p_field = 'mode' THEN
    EXECUTE format(
      'UPDATE c.client_publish_profile SET %I = $1, updated_at = NOW() WHERE client_id = $2 AND platform = $3',
      p_field
    ) USING (p_value #>> '{}'), p_client_id, p_platform;
  ELSE
    EXECUTE format(
      'UPDATE c.client_publish_profile SET %I = $1, updated_at = NOW() WHERE client_id = $2 AND platform = $3',
      p_field
    ) USING (p_value)::boolean, p_client_id, p_platform;
  END IF;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count != 1 THEN
    RAISE EXCEPTION 'Expected 1 row updated, got %', v_updated_count;
  END IF;

  -- Audit trail
  INSERT INTO c.client_publish_profile_audit
    (client_id, platform, field, old_value, new_value, changed_by)
  VALUES
    (p_client_id, p_platform, p_field, v_old_value, p_value, p_changed_by);

  RETURN jsonb_build_object(
    'success',    true,
    'client_id',  p_client_id,
    'platform',   p_platform,
    'field',      p_field,
    'old_value',  v_old_value,
    'new_value',  p_value
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_publish_profile_toggle(uuid, text, text, jsonb, text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_publish_profile_toggle(uuid, text, text, jsonb, text)
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.update_publish_profile_toggle IS
  'Updates a single toggle field on c.client_publish_profile with audit trail. '
  'Allowed fields: mode (auto|manual|staging|null), publish_enabled, r6_enabled, '
  'auto_approve_enabled. Stage 2.1 deliverable.';
```

---

## Frontend spec

CC works in `invegent-dashboard`. The Overview tab is in `app/(dashboard)/clients/page.tsx` — the block under `{activeTab === "overview" && (...)`. Read it before making changes; the existing badge rendering pattern is the right reference.

### New server action

File: `app/(dashboard)/actions/publish-profile-toggle.ts`

```typescript
"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

type ToggleField = "mode" | "publish_enabled" | "r6_enabled" | "auto_approve_enabled";
type ToggleValue = string | boolean | null;

export async function updatePublishProfileToggle(
  clientId: string,
  platform: string,
  field: ToggleField,
  value: ToggleValue
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  // Lesson #33: destructure { error }, throw on error
  const { data, error } = await supabase.rpc("update_publish_profile_toggle", {
    p_client_id: clientId,
    p_platform: platform,
    p_field: field,
    p_value: value,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/clients");
  return { success: true };
}
```

### New client component

File: `app/(dashboard)/components/clients/PublishProfileToggles.tsx`

```typescript
"use client";

import { useState, useTransition } from "react";
import { updatePublishProfileToggle } from "@/app/(dashboard)/actions/publish-profile-toggle";

type Props = {
  clientId: string;
  platform: string;
  initialMode: string | null;
  initialPublishEnabled: boolean | null;
  initialR6Enabled: boolean;
  initialAutoApproveEnabled: boolean;
};

const MODE_OPTIONS: Array<{ value: string | null; label: string; classes: string }> = [
  { value: "auto",    label: "Auto",    classes: "bg-emerald-100 text-emerald-800" },
  { value: "manual",  label: "Manual",  classes: "bg-blue-100 text-blue-800" },
  { value: "staging", label: "Staging", classes: "bg-amber-100 text-amber-800" },
];

export function PublishProfileToggles(props: Props) {
  const [mode, setMode] = useState(props.initialMode);
  const [publishEnabled, setPublishEnabled] = useState(props.initialPublishEnabled);
  const [r6Enabled, setR6Enabled] = useState(props.initialR6Enabled);
  const [autoApprove, setAutoApprove] = useState(props.initialAutoApproveEnabled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateField = (
    field: "mode" | "publish_enabled" | "r6_enabled" | "auto_approve_enabled",
    value: string | boolean | null,
    rollback: () => void
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await updatePublishProfileToggle(
        props.clientId,
        props.platform,
        field,
        value
      );
      if (!result.success) {
        rollback();
        setError(result.error ?? "Failed to update");
      }
    });
  };

  // Render: mode button group + 3 boolean pill toggles + error message inline
  // Match the existing visual style from clients/page.tsx
  return (
    <div className="space-y-3">
      {/* Mode button group */}
      <div>
        <p className="text-xs text-slate-500 mb-1">Mode</p>
        <div className="flex gap-1">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value ?? "null"}
              disabled={isPending}
              onClick={() => {
                const prev = mode;
                setMode(opt.value);
                updateField("mode", opt.value, () => setMode(prev));
              }}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                mode === opt.value
                  ? opt.classes
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3 boolean toggles in a row */}
      <div className="grid grid-cols-3 gap-3">
        <BoolToggle
          label="Publishing"
          value={!!publishEnabled}
          onChange={(v) => {
            const prev = publishEnabled;
            setPublishEnabled(v);
            updateField("publish_enabled", v, () => setPublishEnabled(prev));
          }}
          disabled={isPending}
          onLabel="Enabled"
          offLabel="Disabled"
        />
        <BoolToggle
          label="R6 enabled"
          value={r6Enabled}
          onChange={(v) => {
            const prev = r6Enabled;
            setR6Enabled(v);
            updateField("r6_enabled", v, () => setR6Enabled(prev));
          }}
          disabled={isPending}
          onLabel="On"
          offLabel="Off"
        />
        <BoolToggle
          label="Auto-approve"
          value={autoApprove}
          onChange={(v) => {
            const prev = autoApprove;
            setAutoApprove(v);
            updateField("auto_approve_enabled", v, () => setAutoApprove(prev));
          }}
          disabled={isPending}
          onLabel="On"
          offLabel="Off"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function BoolToggle(props: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{props.label}</p>
      <button
        disabled={props.disabled}
        onClick={() => props.onChange(!props.value)}
        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
          props.value
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-slate-100 text-slate-500"
        } hover:opacity-80`}
      >
        {props.value ? props.onLabel : props.offLabel}
      </button>
    </div>
  );
}
```

### Wire-up in clients/page.tsx

In the Overview tab block, replace the static badge row that currently renders "Publishing", "Auto-approve", "Images", "Video" badges with:

```tsx
<PublishProfileToggles
  clientId={p.client_id}
  platform={p.platform!}
  initialMode={p.mode}
  initialPublishEnabled={p.publish_enabled}
  initialR6Enabled={(p as any).r6_enabled ?? false}
  initialAutoApproveEnabled={p.auto_approve_enabled ?? false}
/>
{/* Below, keep the existing Images and Video badges as read-only — only those two */}
```

Also update the `getPublishProfiles` SQL query in `clients/page.tsx` to include `cpp.r6_enabled` in the SELECT list, and add `r6_enabled: boolean` to the `PublishProfile` type definition.

---

## Verification (V1–V8)

**V1 — Migrations applied**
```sql
SELECT 'audit_table_exists' AS check, EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='c' AND table_name='client_publish_profile_audit') AS result
UNION ALL
SELECT 'rpc_exists', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname='public' AND p.proname='update_publish_profile_toggle');
-- Expect: both true
```

**V2 — Invalid field rejected**
```sql
SELECT public.update_publish_profile_toggle(
  '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid,
  'facebook',
  'page_access_token',
  '"some_token"'::jsonb
);
-- Expect: ERROR "Field page_access_token not allowed"
```

**V3 — Invalid mode rejected**
```sql
SELECT public.update_publish_profile_toggle(
  '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid,
  'facebook',
  'mode',
  '"chaotic"'::jsonb
);
-- Expect: ERROR "Invalid mode value"
```

**V4 — Valid mode update succeeds + audit row created**

CFW client_id = `3eca32aa-e460-462f-a846-3f6ace6a3cae`.

```sql
-- Capture before-state
SELECT mode FROM c.client_publish_profile
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid AND platform = 'facebook';
-- Expect: NULL

-- Update via RPC
SELECT public.update_publish_profile_toggle(
  '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid,
  'facebook',
  'mode',
  '"auto"'::jsonb,
  'verification-test'
);
-- Expect: jsonb result with success=true, old_value=null, new_value="auto"

-- Verify mode was set
SELECT mode FROM c.client_publish_profile
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid AND platform = 'facebook';
-- Expect: 'auto'

-- Verify audit row
SELECT field, old_value, new_value, changed_by
FROM c.client_publish_profile_audit
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid
ORDER BY changed_at DESC LIMIT 1;
-- Expect: field='mode', old_value=null, new_value='"auto"', changed_by='verification-test'
```

**V5 — Reset CFW Facebook mode back to NULL via RPC**
```sql
SELECT public.update_publish_profile_toggle(
  '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid,
  'facebook',
  'mode',
  'null'::jsonb,
  'verification-rollback'
);
-- Expect: success=true, mode is NULL again
-- This restores the pre-V4 state so V8 (browser test) starts clean
```

**V6 — Boolean validation**
```sql
SELECT public.update_publish_profile_toggle(
  '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid,
  'facebook',
  'r6_enabled',
  '"yes"'::jsonb
);
-- Expect: ERROR "Field r6_enabled requires a boolean value"
```

**V7 — Non-existent platform rejected**
```sql
SELECT public.update_publish_profile_toggle(
  '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid,
  'tiktok',
  'mode',
  '"auto"'::jsonb
);
-- Expect: ERROR "No publish profile found"
```

**V8 — Browser test (PK)**
1. Open Vercel preview URL (or production after merge).
2. Navigate to `/clients?client=care-for-welfare-pty-ltd&tab=overview`.
3. CFW Facebook section should show Mode buttons (Auto / Manual / Staging) with none selected (mode is NULL).
4. Click "Auto". Button should highlight emerald immediately. Page does NOT reload.
5. Reload the page manually. Auto button is still highlighted. (Persistence confirmed.)
6. Click "Manual". Switches without reload.
7. Click R6 enabled toggle from Off to On. Pill turns emerald immediately.
8. Reload. R6 still On.
9. Reset CFW Facebook to mode=NULL and r6_enabled=false via the UI before declaring V8 passed (so the production state is unchanged from start of test). Document this as part of test discipline — Stage 2.1 ships the controls, it does not ship the configuration changes.
10. Verify audit table contains all 5+ writes from this test sequence:
```sql
SELECT field, old_value, new_value, changed_by, changed_at
FROM c.client_publish_profile_audit
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid
  AND changed_at > NOW() - INTERVAL '1 hour'
ORDER BY changed_at;
```

---

## Lessons applied

- **Lesson #32 (pre-flight column verification):** Four pre-flight queries above. PF2 caught that there's no DB-level CHECK on `mode` — RPC must enforce the allowed values, not assume DB does.
- **Lesson #33 (Supabase JS write must destructure `{ error }`):** Server action `updatePublishProfileToggle` destructures `{ data, error }` from `.rpc()`. Returns `{ success: false, error: error.message }` to client component which then triggers rollback.
- **Lesson #34 (recovery owns dependent state):** Audit table writes are inside the same RPC as the update, so a failed update cannot leave a stale audit row. Recovery from a bad toggle = call the RPC again with the prior value (the audit table preserves it).

---

## Out of scope — captured for next stages

- **Stage 2.2 — Assigned-but-disabled feed visibility.** Update Feeds tab query to include `is_enabled=false` rows, render distinctly with re-enable + remove buttons.
- **Stage 2.3 — Slot outcome resolver function.** SQL function returning a reason code per scheduled slot.
- **Stage 2.4 — Schedule adherence view.** Dashboard surface that uses 2.3 to show last 14 days of slots with reason codes.
- **Stage 2.5 — YouTube root-cause drill-down.** Why has YouTube stopped? Different pipeline (image-worker → video-worker → youtube-publisher), needs its own diagnostic.
- **Instagram per-client enablement** is NOT in 2.1 because it requires understanding of cron-level vs profile-level gating that we haven't done yet. Do not bundle into 2.1.
- **Surfacing audit history** in the UI (a read view of `c.client_publish_profile_audit`). Future stage if PK wants it.

---

## Risks and mitigations

- **Risk:** PK accidentally toggles something on production while testing V8.
  **Mitigation:** V8 step 9 explicitly resets CFW Facebook to its starting state. Stage 2.1 ships controls, not configuration changes. Configuration changes are PK's deliberate decision after the controls land.

- **Risk:** Optimistic UI updates without server confirmation could mislead PK.
  **Mitigation:** On RPC error, the rollback fires and an error message renders inline. PK sees the failure within ~200ms.

- **Risk:** `updated_at` column on the profile is set by the RPC's UPDATE. If a trigger also writes to `updated_at` based on row mutation, there could be a conflict.
  **Mitigation:** Pre-flight check by CC: `SELECT * FROM information_schema.triggers WHERE event_object_schema='c' AND event_object_table='client_publish_profile';` — if non-zero rows surface, document and decide whether RPC should drop the explicit `updated_at = NOW()` set.

- **Risk:** R6 enabled is `NOT NULL DEFAULT false` — toggling it via UI should be safe but PK should understand that flipping it true on a client that's not actually configured for R6 may cause unexpected publisher behaviour.
  **Mitigation:** Out of scope to detect this in 2.1. Stage 2.5 (root-cause drill-down) is the right place to surface "you toggled R6 but no R6 cron is firing for this client".

---

## Order of operations (for CC)

1. Run all 4 pre-flight queries via Supabase MCP `execute_sql`. Confirm match.
2. Apply migration `20260428_003_section_2_stage_1_audit_table.sql` via MCP `apply_migration`. Verify V1.
3. Apply migration `20260428_004_section_2_stage_1_toggle_rpc.sql` via MCP `apply_migration`. Verify V1.
4. Run V2, V3, V4, V5, V6, V7 via MCP `execute_sql`. All must pass.
5. Branch `feature/publisher-stage-2.1` in invegent-dashboard.
6. Add `r6_enabled` to `getPublishProfiles` SQL query and `PublishProfile` type.
7. Create `app/(dashboard)/actions/publish-profile-toggle.ts`.
8. Create `app/(dashboard)/components/clients/PublishProfileToggles.tsx`.
9. Wire `<PublishProfileToggles>` into the Overview tab block in `clients/page.tsx`. Remove the old Publishing + Auto-approve badges (kept by Images and Video badges, those stay read-only).
10. Run `npx tsc --noEmit`. Zero errors required.
11. Commit. Push. Vercel preview deploys.
12. Hand preview URL to PK for V8.
13. After V8 passes, merge both branches (content-engine + dashboard) to main.

---

## What success looks like at end of stage

PK opens dashboard → Clients → Care for Welfare → Overview. Sees CFW Facebook with mode buttons (none highlighted). Clicks Auto. Mode is now `auto` in production, no SQL needed. Same for R6, publish_enabled, auto_approve_enabled. Audit row exists for every change.

This stage doesn't fix the four NULL `mode` rows — PK does that, deliberately, with awareness, after seeing the UI. That's the entire point of putting controls in the UI: PK regains the agency that SQL diagnosis was masking.

---

*End of Stage 2.1 brief.*
