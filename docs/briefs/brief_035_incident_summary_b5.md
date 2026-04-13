# Claude Code Brief 035 — Incident Summary in B5 Manager Report

**Date:** 13 April 2026
**Phase:** D — Intelligence
**Repo:** `Invegent-content-engine`
**Working directory:** `C:\Users\parve\Invegent-content-engine`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** Supabase MCP, GitHub MCP
**Estimated time:** 1 hour

---

## What this builds

The B5 weekly manager report currently shows posts, tokens, and stuck jobs.
This brief adds a pipeline incident summary section: how many incidents this week,
how many auto-healed, how many required manual action, MTTR.

Gives PK a weekly view of system reliability as scale increases.

---

## Task 1 — Read current weekly-manager-report function

```bash
cat supabase/functions/weekly-manager-report/index.ts
```

Identify:
- The `gatherStats()` function
- The `buildEmail()` function
- Where to add the incident section

---

## Task 2 — Add incident stats to gatherStats()

Add to the parallel queries in `gatherStats()`:

```typescript
// Incident summary for last 7 days
const { data: incidentRows } = await supabase.rpc('exec_sql', {
  query: `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE auto_healed = true) AS auto_healed,
      COUNT(*) FILTER (WHERE auto_healed = false AND resolved_at IS NOT NULL) AS manually_resolved,
      COUNT(*) FILTER (WHERE resolved_at IS NULL) AS still_open,
      ROUND(AVG(
        EXTRACT(EPOCH FROM (resolved_at - detected_at)) / 60
      ) FILTER (WHERE resolved_at IS NOT NULL), 1) AS avg_mttr_minutes
    FROM m.pipeline_incident
    WHERE detected_at > NOW() - INTERVAL '7 days'
  `
});

const incidentSummary = (incidentRows as any[])?.[0] ?? {
  total: 0, auto_healed: 0, manually_resolved: 0, still_open: 0, avg_mttr_minutes: null
};
```

Return `incidentSummary` as part of the stats object.

---

## Task 3 — Add incident section to buildEmail()

Add a new section in the HTML email between the client table and the footer.

If `incidentSummary.total === 0`:
```html
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 20px;margin-bottom:16px;">
  <p style="font-size:14px;color:#166534;margin:0;">✅ No pipeline incidents this week.</p>
</div>
```

If incidents > 0:
```html
<div style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:16px;">
  <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
    <p style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Pipeline incidents this week</p>
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#334155;">Total incidents</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;text-align:right;">{total}</td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:10px 16px;font-size:13px;color:#334155;">✅ Auto-healed</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#16a34a;text-align:right;">{auto_healed}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#334155;">👤 Manually resolved</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;text-align:right;">{manually_resolved}</td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:10px 16px;font-size:13px;color:#334155;">⏳ Still open</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;{still_open > 0 ? 'color:#dc2626;' : ''}text-align:right;">{still_open}</td>
    </tr>
    {avg_mttr_minutes ? `
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#334155;">Avg time to resolve</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;text-align:right;">{avg_mttr_minutes} min</td>
    </tr>` : ''}
  </table>
</div>
```

---

## Task 4 — Bump version and deploy

Bump VERSION to `weekly-manager-report-v1.1.0`.

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/weekly-manager-report/
git commit -m "feat: weekly-manager-report v1.1.0 — incident summary section (total, auto-healed, MTTR)"
git push origin main
npx supabase functions deploy weekly-manager-report --project-ref mbkmaxqhsohbtwsqolns
```

## Task 5 — Manual test

Invoke and check the response includes incident data:
```bash
curl -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/weekly-manager-report \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

The email received at pk@invegent.com should now have the incidents section.
This week it will show: 1 total, 0 auto-healed, 0 manually resolved, 1 still open (CFW).

---

## Task 6 — Write result file

Write `docs/briefs/brief_035_result.md` in Invegent-content-engine.
