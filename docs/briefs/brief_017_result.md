# Brief 017 Result — AI Profile Bootstrap Edge Function

**Executed:** 12 April 2026
**Executor:** Claude Code (Opus 4.6)
**Repos:** Invegent-content-engine (Edge Function + DB), invegent-dashboard (wiring + UI)
**Supabase project:** mbkmaxqhsohbtwsqolns

---

## Task Results

| Task | Description | Status |
|------|-------------|--------|
| 1 | DB: update_submission_ai_scan() SECURITY DEFINER | COMPLETED |
| 2 | DB: approve_onboarding() copies AI profile + UNIQUE constraint | COMPLETED |
| 3 | Create ai-profile-bootstrap Edge Function | COMPLETED |
| 4 | Git push + deploy Edge Function | COMPLETED (ACTIVE) |
| 5 | Wire run-scans API to call ai-profile-bootstrap | COMPLETED |
| 6 | AI Profile Draft section + checklist item update | COMPLETED |
| 7 | Write result file | COMPLETED |

---

## DB Changes

| Object | Type | Action |
|--------|------|--------|
| public.update_submission_ai_scan(UUID, JSONB) | Function | CREATED |
| public.approve_onboarding() | Function | UPDATED (adds AI profile copy block) |
| c.client_ai_profile UNIQUE (client_id) | Constraint | ADDED (client_ai_profile_client_id_unique) |

### approve_onboarding now does on approval:
1. Create client
2. Create portal_user
3. Create service agreement
4. Copy brand_scan_result to c.client_brand_profile (Brief 016)
5. Copy ai_profile_scan_result to c.client_ai_profile with status='draft' (Brief 017)
6. Mark submission approved

---

## Edge Function

- **Name:** ai-profile-bootstrap
- **Version:** v1.0.0
- **Status:** ACTIVE (deployed via Supabase MCP)
- **JWT verification:** Disabled (called with service_role key)
- **API key:** Uses `ANTHROPIC_API_KEY` env (same as ai-worker, ai-diagnostic, etc.)

### Pipeline
1. Load submission from `c.onboarding_submission` (reads both form_data and top-level columns)
2. Fetch website content via Jina (15s timeout, capped at 8000 chars)
3. Fetch Facebook page via Jina (best-effort, non-fatal if blocked)
4. Build prompt with business info, services, NDIS status, objectives, website/FB content
5. Call Claude claude-sonnet-4-6 with structured JSON output request
6. Parse JSON response (strips markdown code blocks, validates required keys)
7. Write ai_profile_scan_result to submission form_data via update_submission_ai_scan()

### Generated profile contains:
- persona_description, presenter_name, brand_voice, style_notes
- profession_slug (from taxonomy), content_topics
- system_prompt_draft (follows "You are the content writer for the brand..." pattern)

---

## Dashboard Changes (invegent-dashboard)

| File | Change |
|------|--------|
| app/api/onboarding/run-scans/route.ts | Added ai-profile-bootstrap call after brand-scanner |
| app/(dashboard)/onboarding/page.tsx | Added AI Profile Draft section + updated checklist item |

### Run Scans flow now:
1. Brand-scanner (logo + colours extraction)
2. AI-profile-bootstrap (Claude generates persona + system prompt)
3. Returns combined result

### Commits
- `Invegent-content-engine` `1486605` — ai-profile-bootstrap Edge Function
- `invegent-dashboard` `cd76d56` — wiring + UI

---

## Notes

- ANTHROPIC_API_KEY is the correct env name (verified from existing Edge Functions)
- No secret was found in Supabase vault — the key is set as an Edge Function secret (standard pattern)
- Facebook Jina fetch is best-effort — blocked pages produce null, scan continues with website only
- If Claude returns non-JSON, the function throws and returns 500 — no corrupt data written
- AI profile is created with status='draft' — PK must manually activate before content generates
- The UNIQUE constraint on client_ai_profile.client_id was missing — added for ON CONFLICT to work
