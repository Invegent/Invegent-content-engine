# Claude Code Brief 015 — Dashboard Onboarding Checklist Panel

**Date:** 12 April 2026  
**Status:** READY TO RUN  
**Decisions:** D087, D088  
**Repo:** `invegent-dashboard`  
**Working directory:** `C:\Users\parve\invegent-dashboard`  
**Estimated time:** 2–3 hours  

---

## Context

The dashboard onboarding page at `app/(dashboard)/onboarding/page.tsx` has a
slide-in detail panel showing 7 sections of submission data. This brief adds:

1. New sections for fields added in Brief 014 (logo, services, NDIS, objectives)
2. A readiness checklist showing what's complete before PK approves
3. A "Run Scans" button that queues the brand-scanner and AI profile bootstrap

The `SubmissionDetail` type is `Record<string, any>` so all Brief 014 fields
(logo_data_url, service_list, serves_ndis, ndis_registration, content_objectives)
are already present in `detail` from the DB — no type changes needed.

**File to edit:** `app/(dashboard)/onboarding/page.tsx`  
This is one large client component. Add to it, do not split into files.

---

## Task 1 — Add new sections to the detail panel

In the detail panel, after the existing `<Section title="Content">` block and
before `<Section title="Platforms & Reporting">`, add:

```tsx
{/* Services section — show if provided */}
{detail.service_list && (
  <Section title="Services">
    <div className="text-slate-800 text-xs whitespace-pre-line bg-slate-50 rounded p-2">
      {detail.service_list}
    </div>
  </Section>
)}

{/* NDIS section — show if provided */}
{detail.serves_ndis && (
  <Section title="NDIS">
    <Row label="Serves NDIS" val={detail.serves_ndis} />
    <Row label="Registration" val={detail.ndis_registration} />
  </Section>
)}

{/* Content objectives — show if provided */}
{Array.isArray(detail.content_objectives) && detail.content_objectives.length > 0 && (
  <Section title="Content Objectives">
    <div className="flex flex-wrap gap-1.5">
      {detail.content_objectives.map((obj: string) => (
        <span key={obj} className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full px-2 py-0.5">
          {obj}
        </span>
      ))}
    </div>
  </Section>
)}

{/* Logo preview — show if uploaded */}
{detail.logo_data_url && (
  <Section title="Logo (uploaded)">
    <div className="flex items-center gap-3">
      <img
        src={detail.logo_data_url}
        alt="Client logo"
        className="h-10 w-auto max-w-[120px] object-contain border border-slate-200 rounded p-1 bg-white"
      />
      <span className="text-xs text-slate-400">{detail.logo_file_name}</span>
    </div>
  </Section>
)}
```

---

## Task 2 — Add readiness checklist

Add a `ReadinessChecklist` component at the bottom of the file (before the
closing bracket of the file, after the other helper components).

```tsx
function ReadinessChecklist({ detail, scanStatus }: {
  detail: SubmissionDetail;
  scanStatus: 'idle' | 'running' | 'done' | 'error';
}) {
  const checks = [
    {
      label: 'Contact and business details complete',
      pass: !!(detail.contact_name && detail.business_name && detail.contact_email),
    },
    {
      label: 'Social media URLs provided',
      pass: !!(detail.facebook_page_url || detail.linkedin_url || detail.instagram_url),
      warn: true, // warn not fail — some clients may not have pages yet
    },
    {
      label: 'Service list provided',
      pass: !!(detail.service_list?.trim()),
      warn: true,
    },
    {
      label: 'Logo uploaded or website provided for extraction',
      pass: !!(detail.logo_data_url || detail.website_url),
    },
    {
      label: 'Content objectives selected',
      pass: Array.isArray(detail.content_objectives) && detail.content_objectives.length > 0,
      warn: true,
    },
    {
      label: 'Brand scan complete',
      pass: scanStatus === 'done',
      pending: scanStatus === 'running',
      action: 'Run Scans',
    },
    {
      label: 'AI profile drafted',
      pass: scanStatus === 'done',
      pending: scanStatus === 'running',
    },
    {
      label: 'Package selected',
      pass: !!(detail.selected_package_code),
    },
    {
      label: 'Service agreement signed',
      pass: !!(detail.agreement_accepted && detail.agreement_signed_name),
    },
  ];

  return (
    <div className="space-y-1.5">
      {checks.map((c) => {
        const icon = c.pending ? '⏳' : c.pass ? '✅' : c.warn ? '⚠️' : '❌';
        const labelColor = c.pending
          ? 'text-slate-500'
          : c.pass
          ? 'text-slate-700'
          : c.warn
          ? 'text-amber-700'
          : 'text-red-600';
        return (
          <div key={c.label} className="flex items-center gap-2">
            <span className="text-sm w-5 shrink-0">{icon}</span>
            <span className={`text-xs ${labelColor}`}>{c.label}</span>
          </div>
        );
      })}
    </div>
  );
}
```

---

## Task 3 — Add scanStatus state and Run Scans button to detail panel

In `OnboardingPage`, add state:
```tsx
const [scanStatus, setScanStatus] = useState<Record<string, 'idle' | 'running' | 'done' | 'error'>>({});
```

Add a `handleRunScans` function:
```tsx
const handleRunScans = async () => {
  if (!detail) return;
  const sid = detail.submission_id as string;
  setScanStatus(prev => ({ ...prev, [sid]: 'running' }));
  try {
    const res = await fetch('/api/onboarding/run-scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: sid }),
    });
    const json = await res.json();
    if (json.ok) {
      setScanStatus(prev => ({ ...prev, [sid]: 'done' }));
      showToast('Scans queued successfully.');
    } else {
      setScanStatus(prev => ({ ...prev, [sid]: 'error' }));
      showToast('Scan failed: ' + (json.error ?? 'unknown error'));
    }
  } catch (e) {
    setScanStatus(prev => ({ ...prev, [sid]: 'error' }));
    showToast('Scan request failed.');
  }
};
```

In the detail panel, add a "Readiness" section ABOVE the Actions block
(just before `{/* Actions */}`):

```tsx
{/* Readiness Checklist */}
<Section title="Readiness Checklist">
  <ReadinessChecklist
    detail={detail}
    scanStatus={scanStatus[detail.submission_id] ?? 'idle'}
  />

  {/* Run Scans button — only show if not approved */}
  {detail.status !== 'approved' && detail.status !== 'rejected' && (
    <div className="mt-3 pt-3 border-t border-slate-100">
      {(scanStatus[detail.submission_id] ?? 'idle') === 'running' ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 size={12} className="animate-spin" />
          Scans running…
        </div>
      ) : (
        <button
          onClick={handleRunScans}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
        >
          <RefreshCw size={12} />
          Run Scans
        </button>
      )}
      <p className="text-xs text-slate-400 mt-1.5">
        Runs brand extraction (logo + colours) and AI profile bootstrap.
        Review results before approving.
      </p>
    </div>
  )}
</Section>
```

---

## Task 4 — Create the Run Scans API route

**File:** `app/api/onboarding/run-scans/route.ts`

This is a stub for now. When brand-scanner and AI profile bootstrap
Edge Functions are built (Brief 015/016 in content-engine), this route
will invoke them. For now it validates the request and returns success.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submission_id } = body;

    if (!submission_id) {
      return NextResponse.json({ ok: false, error: 'submission_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify submission exists and is not already approved
    const { data } = await supabase.rpc('exec_sql', {
      query: `
        SELECT submission_id, status, website_url, logo_data_url
        FROM c.onboarding_submission
        WHERE submission_id = '${submission_id}'
        LIMIT 1
      `,
    });

    if (!data?.[0]) {
      return NextResponse.json({ ok: false, error: 'Submission not found' }, { status: 404 });
    }

    const submission = data[0];

    if (submission.status === 'approved') {
      return NextResponse.json({ ok: false, error: 'Submission already approved' }, { status: 400 });
    }

    // TODO: Invoke brand-scanner Edge Function
    // await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/brand-scanner`, {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    //   body: JSON.stringify({ submission_id }),
    // });

    // TODO: Invoke ai-profile-bootstrap Edge Function
    // await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-profile-bootstrap`, {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    //   body: JSON.stringify({ submission_id }),
    // });

    console.log(`[run-scans] Scan queued for submission ${submission_id}`);

    return NextResponse.json({
      ok: true,
      message: 'Scans queued. Brand-scanner and AI profile bootstrap will be implemented in the next build session.',
      submission_id,
    });
  } catch (error) {
    console.error('[run-scans] error:', error);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
```

---

## Task 5 — Update the approve modal

Update the approve modal bullet list to include brand and AI profile context.
Replace the existing `<ul>` inside the approve modal with:

```tsx
<ul className="text-sm text-slate-600 list-disc ml-5 mb-4 space-y-1">
  <li>Create a client account for {detail.business_name}</li>
  <li>Set up portal access for {detail.contact_email}</li>
  <li>Send a magic link login email to {detail.contact_email}</li>
  <li>Create a service agreement for {detail.package_label} at ${detail.base_price_aud}/month</li>
  {detail.logo_data_url || detail.website_url ? (
    <li className="text-emerald-700">Brand profile ready for extraction ✓</li>
  ) : (
    <li className="text-amber-600">No logo or website provided — brand profile will be generic</li>
  )}
</ul>
```

---

## Task 6 — Build, commit, deploy

```bash
cd C:\Users\parve\invegent-dashboard
npm run build
```

Fix any TypeScript errors. Then:

```bash
git add -A
git commit -m "feat: onboarding checklist panel + run scans button + new submission fields (D087/D088)"
git push origin main
```

Vercel auto-deploys. Confirm dashboard.invegent.com/onboarding loads and:
- Detail panel shows Services, NDIS, Content Objectives, Logo sections when data present
- Readiness Checklist section appears above the action buttons
- Run Scans button is visible (violet, shows for pending/ready submissions)

---

## Task 7 — Write result file

Write `docs/briefs/brief_015_result.md` in Invegent-content-engine:
- Tasks 1–6: COMPLETED / FAILED
- Build: PASS / FAIL
- Commit SHA
- Notes

---

## Error handling

- If `detail.logo_data_url` is a very long base64 string, the `<img src={...}>`
  will still work — browsers support data URLs in src attributes.
- If `detail.content_objectives` is stored as a JSON string rather than an array,
  parse it: `JSON.parse(detail.content_objectives)` with try/catch.
- The `scanStatus` state is keyed by submission_id so switching between
  submissions does not reset the scan state.
- If the `RefreshCw` icon import conflicts, it is already imported in the file.
  Check the existing imports before adding duplicates.

---

## What this brief does NOT include

- brand-scanner Edge Function (Supabase Edge Function — separate brief)
- ai-profile-bootstrap Edge Function (separate brief)
- Brand colours/logo preview populated from c.client_brand_profile (requires Edge Functions first)
- Inline editing of AI profile draft in the dashboard (future)
- Auto-running scans on submission receive (future)
