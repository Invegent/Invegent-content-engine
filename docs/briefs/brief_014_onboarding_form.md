# Claude Code Brief 014 — Onboarding Form Intelligence Updates

**Date:** 12 April 2026  
**Status:** READY TO RUN  
**Decisions:** D087  
**Repo:** `invegent-portal`  
**Working directory:** `C:\Users\parve\invegent-portal`  
**Estimated time:** 2–3 hours  

---

## Context

The 7-step onboarding form at `portal.invegent.com/onboard` collects who the
client is but not what they want their content to achieve or what services they
deliver. This brief adds three sets of fields to existing steps.

**The form stays at 7 steps.** We are adding fields to existing steps only.

**File to edit:** `app/onboard/OnboardingForm.tsx`  
This is a single large client component. Do not split it into separate files.

---

## What to add — overview

| Step | What to add |
|---|---|
| Step 1 (Contact) | Optional logo upload (file → base64, stored in submission) |
| Step 2 (Business) | Service list textarea + NDIS provider questions |
| Step 4 (Content Preferences) | Content objectives multi-select (5 options) |

---

## Task 1 — Update FormState type

Add these fields to the `FormState` type and the `initial` object:

```typescript
// Logo
logo_file_name: string        // display name only, e.g. "logo.png"
logo_data_url: string         // base64 data URL, e.g. "data:image/png;base64,..."
logo_size_kb: number          // file size in KB for validation

// Services
service_list: string          // free text, one per line

// NDIS
serves_ndis: string           // 'yes' | 'no' | 'not_sure' | ''
nidis_registration: string    // 'registered' | 'unregistered' | 'mixed' | 'unknown' | ''

// Content objectives
content_objectives: string[]  // multi-select
```

Initial values:
```typescript
logo_file_name: '', logo_data_url: '', logo_size_kb: 0,
service_list: '',
serves_ndis: '', ndis_registration: '',
content_objectives: [],
```

---

## Task 2 — Step 1: Logo upload field

Add after the existing 4 fields in Step 1 (Contact Details).

```tsx
{/* Logo upload */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    Business logo
    <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
  </label>
  <p className="text-xs text-slate-400 mb-2">
    Upload your logo and we’ll use it to personalise your portal.
    If you skip this, we’ll try to find it from your website.
  </p>

  {form.logo_file_name ? (
    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
      <span className="text-xs text-emerald-700 font-medium">{form.logo_file_name}</span>
      <span className="text-xs text-emerald-600">({form.logo_size_kb}KB)</span>
      <button
        type="button"
        onClick={() => { set('logo_file_name', ''); set('logo_data_url', ''); set('logo_size_kb', 0); }}
        className="ml-auto text-xs text-slate-400 hover:text-slate-600"
      >
        Remove
      </button>
    </div>
  ) : (
    <label className="flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
      <span className="text-sm text-slate-500">Click to upload PNG, SVG or JPG</span>
      <input
        type="file"
        accept="image/png,image/svg+xml,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const sizeKb = Math.round(file.size / 1024);
          if (sizeKb > 2048) {
            setError('Logo file must be under 2MB');
            return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
            set('logo_file_name', file.name);
            set('logo_data_url', ev.target?.result as string);
            set('logo_size_kb', sizeKb);
            setError(null);
          };
          reader.readAsDataURL(file);
        }}
      />
    </label>
  )}
</div>
```

---

## Task 3 — Step 2: Service list + NDIS questions

Add after the existing Step 2 fields (after `industry_detail` textarea).

```tsx
{/* Service list */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    What services do you offer?
    <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
  </label>
  <p className="text-xs text-slate-400 mb-2">
    List the specific services you want featured in your content. One per line.
    Be specific — “OT home assessment” is more useful than “occupational therapy”.
  </p>
  <textarea
    value={form.service_list}
    onChange={e => set('service_list', e.target.value)}
    rows={4}
    placeholder={"e.g.\nOT home assessment\nAssistive technology recommendations\nNDIS plan review support"}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono"
  />
</div>

{/* NDIS questions */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-2">
    Do you work with NDIS participants?
  </label>
  <div className="space-y-2">
    {[
      { value: 'yes', label: 'Yes — NDIS participants are part of our client base' },
      { value: 'no', label: 'No — we do not serve NDIS participants' },
      { value: 'not_sure', label: 'Not sure' },
    ].map(opt => (
      <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="radio"
          name="serves_ndis"
          checked={form.serves_ndis === opt.value}
          onChange={() => set('serves_ndis', opt.value)}
          className="border-slate-300"
        />
        {opt.label}
      </label>
    ))}
  </div>
</div>

{/* NDIS registration — only show if they said yes or not_sure */}
{(form.serves_ndis === 'yes' || form.serves_ndis === 'not_sure') && (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      Are you a registered NDIS provider?
    </label>
    <div className="space-y-2">
      {[
        { value: 'registered', label: 'Yes — we are NDIS registered' },
        { value: 'unregistered', label: 'No — we work with self-managed participants' },
        { value: 'mixed', label: 'Some services registered, some not' },
        { value: 'unknown', label: 'Not sure' },
      ].map(opt => (
        <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="ndis_registration"
            checked={form.ndis_registration === opt.value}
            onChange={() => set('ndis_registration', opt.value)}
            className="border-slate-300"
          />
          {opt.label}
        </label>
      ))}
    </div>
  </div>
)}
```

---

## Task 4 — Step 4: Content objectives multi-select

Add as the FIRST field in Step 4 (Content Preferences), before the existing
brand voice radio group.

```tsx
{/* Content objectives */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    What do you want your content to achieve?
  </label>
  <p className="text-xs text-slate-400 mb-3">
    Select all that apply. We use this to set your content mix automatically.
  </p>
  <div className="space-y-2">
    {[
      'Educate people about my industry and services',
      'Promote my specific services and availability',
      'Build our reputation and brand awareness',
      'Share community stories and client outcomes',
      'Show we are trustworthy and credible',
    ].map(obj => (
      <label key={obj} className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.content_objectives.includes(obj)}
          onChange={e => {
            const next = e.target.checked
              ? [...form.content_objectives, obj]
              : form.content_objectives.filter(x => x !== obj);
            set('content_objectives', next);
          }}
          className="rounded border-slate-300 mt-0.5 shrink-0"
        />
        <span>{obj}</span>
      </label>
    ))}
  </div>
</div>
```

---

## Task 5 — Include new fields in submission payload

**File:** `actions/onboarding.ts`

First, read the current `OnboardingFormData` type and `submitOnboarding` function.

Add these fields to the `OnboardingFormData` type:
```typescript
logo_file_name?: string
logo_data_url?: string
service_list?: string
serves_ndis?: string
ndis_registration?: string
content_objectives?: string[]
```

In the `handleSubmit` function in `OnboardingForm.tsx`, add these to the `data` object:
```typescript
logo_file_name: form.logo_file_name || undefined,
logo_data_url: form.logo_data_url || undefined,
service_list: form.service_list.trim() || undefined,
serves_ndis: form.serves_ndis || undefined,
ndis_registration: form.ndis_registration || undefined,
content_objectives: form.content_objectives.length > 0 ? form.content_objectives : undefined,
```

The `submit_onboarding` DB function accepts a JSONB blob — all new fields will
be stored inside the submission record automatically. No DB migration needed.

**Important:** `logo_data_url` can be large (up to ~2MB base64). It is stored
temporarily in the submission JSONB. The brand-scanner Edge Function will later
pick it up, upload to Supabase Storage, and write the path to `c.client_brand_profile`.

---

## Task 6 — Build and verify

```bash
cd C:\Users\parve\invegent-portal
npm run build
```

Expected: 0 errors.  
If TypeScript errors on the new fields in `OnboardingFormData`, update the type in `actions/onboarding.ts`.

---

## Task 7 — Commit and push

```bash
git add -A
git commit -m "feat: onboarding form intelligence — logo upload, service list, NDIS questions, content objectives (D087)"
git push origin main
```

Confirm Vercel deploys. Visit `portal.invegent.com/onboard` and verify:
- Step 1 shows logo upload area
- Step 2 shows service list + NDIS questions
- Step 4 shows content objectives checkboxes at the top

---

## Task 8 — Write result file

Write `docs/briefs/brief_014_result.md` in Invegent-content-engine:
- Tasks 1–7: COMPLETED / FAILED
- Build status
- Commit SHA
- Any notes

---

## Error handling

- If `actions/onboarding.ts` does not export `OnboardingFormData` as a type,
  check the actual export name and update accordingly.
- If the `submitOnboarding` server action strips unknown fields before sending
  to the DB function, check the function body and add the new fields to the
  payload object inside the action.
- The logo_data_url field may be empty string in the payload — the action
  should send `undefined` (not empty string) for optional fields.
- Do not change any step labels, step count, navigation logic, or agreement text.
- Do not remove any existing fields from any step.

---

## What this brief does NOT include

- Brand-scanner Edge Function (Brief 015)
- AI profile bootstrap Edge Function (Brief 016)
- Dashboard onboarding checklist panel with Run Scans button (Brief 017)
- NDIS registration group field (kept out of public form per D087 decision)
- Topics to avoid field (PK adds manually after onboarding call, per D087)
- Format preferences (moved to portal Settings after client sees first content)
