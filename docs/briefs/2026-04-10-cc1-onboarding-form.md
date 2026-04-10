# CC1 Brief — Public Onboarding Form

## Context

Read `docs/00_sync_state.md` before starting.

This is Claude Code session CC1 of 4 for the client portal + onboarding build.
We are building a public multi-step onboarding form at `portal.invegent.com/onboard`.
The form is for prospective clients to self-serve — no login required.
On submit, the data is stored in `c.onboarding_submission` and an email notification
is sent to the operator.

## Repos
- Portal: `github.com/Invegent/invegent-portal` (Next.js, Vercel, portal.invegent.com)
- Engine: `github.com/Invegent/Invegent-content-engine` (Supabase Edge Functions)

## Supabase Project
- Project ref: `mbkmaxqhsohbtwsqolns`

## What Exists Already

### DB (already migrated — do not re-run)
- `c.platform_channel` — seeded with 8 channel types
- `c.service_package` — seeded with 4 packages (starter/standard/growth/professional), all version 1
- `c.service_package_channel` — package/channel mappings seeded
- `c.onboarding_submission` — table exists, ready to receive rows
- `c.client_service_agreement` — table exists

### Portal app structure
```
app/
  (auth)/
    login/       — magic link login (working)
    callback/    — auth callback (working)
  (portal)/
    inbox/       — draft approval (working)
    calendar/
    performance/
    feeds/
    layout.tsx
  globals.css
  layout.tsx
  page.tsx       — root redirect
actions/
  auth.ts
  portal.ts
lib/
  portal-auth.ts
  supabase/
middleware.ts
```

## What To Build

### 1. Public Supabase client

Create `lib/supabase/public.ts` — a Supabase client using the anon key only.
This is used by the onboarding form (no auth context).

```typescript
import { createBrowserClient } from '@supabase/ssr'
export function createPublicClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 2. Server action: submit onboarding

Create `actions/onboarding.ts`:

```typescript
'use server'
// submitOnboarding(data: OnboardingFormData): Promise<{ ok: boolean, submissionId?: string, error?: string }>
// - Validates required fields
// - Inserts into c.onboarding_submission via exec_sql (service client, bypasses RLS)
// - Calls Edge Function `onboarding-notifier` to send operator notification email
// - Returns submissionId on success
```

Required fields: contact_name, contact_email, business_name, agreement_accepted, selected_package_code.
All other fields are optional at submission — operator can request more info.

### 3. Server action: fetch packages for form

In `actions/onboarding.ts`, also export:
```typescript
// getPackagesForForm(): returns all current packages with their channel breakdowns
// Query:
SELECT sp.*, 
  json_agg(json_build_object(
    'channel_code', spc.channel_code,
    'posts_per_week', COALESCE(spc.posts_per_week_override, pc.posts_per_week),
    'platform', pc.platform,
    'description', pc.description
  )) AS channels
FROM c.service_package sp
JOIN c.service_package_channel spc ON spc.service_package_id = sp.service_package_id
JOIN c.platform_channel pc ON pc.channel_code = spc.channel_code
WHERE sp.is_current = true
GROUP BY sp.service_package_id
ORDER BY sp.base_price_aud
```

### 4. The onboarding form — `app/onboard/`

Route: `portal.invegent.com/onboard` (public, no auth required)
Exclude from middleware auth checks.

Create `app/onboard/page.tsx` — the 7-step form.
Create `app/onboard/OnboardingForm.tsx` — client component with step state.

**UX requirements:**
- Progress bar showing current step / 7
- Each step validates before allowing Next
- Back button always available
- Form state preserved across steps (useReducer or useState object)
- Mobile responsive
- Clean, professional design — matches portal aesthetic
- On final submit: show success screen with "What happens next" explanation

**Steps:**

**Step 1 — Contact**
- Full name (required)
- Email address (required, validate format)
- Phone number (optional)
- Your role in the business (optional, text)

**Step 2 — Business**
- Business name (required)
- ABN (optional, 11-digit format hint)
- Website URL (optional)
- State (dropdown: ACT, NSW, NT, QLD, SA, TAS, VIC, WA)
- Industry / sector (text input — generic, not NDIS-specific)
- Tell us more about your business (optional textarea)

**Step 3 — Social Presence**
- Facebook Page URL (optional)
- Instagram (optional)
- LinkedIn (optional)
- YouTube (optional)
- Current approximate following (dropdown: Just starting out (0–100), Growing (100–500), Established (500–2,000), Large audience (2,000+))

**Step 4 — Content Preferences**
- How would you describe your brand voice? (radio: Professional & authoritative, Warm & approachable, Educational & informative, Conversational & relatable)
- Topics you want to focus on (textarea)
- Anything you want to avoid in your content (textarea)
- Publishing preference (radio: Auto-publish everything, I want to approve each post first, Mix — auto for most, I approve campaigns)
- Do you have brand assets ready? (logo, colours, images) (yes/no toggle)

**Step 5 — Platform Preferences**
- Which platforms do you want to publish on? (multi-select checkboxes: Facebook, Instagram, LinkedIn, YouTube, Email newsletter)
- Reporting preference (radio: Weekly email summary, Monthly email summary, I'll check the portal myself, No reports needed)
- Do you have planned periods where you don't want content published? (yes/no — if yes, note that they can manage this in the portal)

**Step 6 — Service Package**
- Fetch packages from DB (server-side on page load, pass as prop)
- Show 4 package cards: Starter / Standard / Growth / Professional
- Each card shows: name, price, tagline, platform list, posts/week breakdown
- User selects one (required before proceeding)
- "Not sure which plan?" — show a simple comparison note

**Step 7 — Service Agreement**
- Show the full service agreement text (fetch from a static string or a file — see below)
- Scrollable box, minimum 200px tall
- "I have read and understood the Service Agreement" checkbox (required)
- "Type your full name to sign" text input (required, must match contact_name from Step 1 — case-insensitive)
- Submit button: "Submit Application"

**On submit:**
- Call `submitOnboarding()` server action
- If error: show error message, do not clear form
- If success: replace form with success screen:
  - "Application received — thank you, [contact_name]!"
  - "We'll review your details within 1–2 business days."
  - "You'll receive an email at [email] with next steps."
  - "Questions? Email hello@invegent.com"

### 5. Service agreement text

Create `lib/agreement-text.ts` — exports the agreement as a TypeScript string constant.
Use the template from `docs/legal/service_agreement_v1.md` but with placeholders replaced
by dynamic values from the form (package name, price, platforms, signed name, date, IP).

The agreement shown in Step 7 should have the package details pre-filled based on
what they selected in Step 6.

### 6. Edge Function: onboarding-notifier

Create `supabase/functions/onboarding-notifier/index.ts`

Triggered by the `submitOnboarding` server action (POST with submission_id).

Sends an email via Resend to `onboarding@invegent.com` (operator notification):

```
Subject: New onboarding submission — [BUSINESS_NAME]

A new client has submitted an onboarding application.

Business: [BUSINESS_NAME]
Contact: [CONTACT_NAME] ([CONTACT_EMAIL])
Package: [PACKAGE_LABEL] ($[PRICE]/month)
Platforms: [PLATFORM_LIST]
Submitted: [TIMESTAMP]

Review in dashboard: dashboard.invegent.com/onboarding
```

Also sends confirmation email to the client's email:

```
Subject: Your Invegent application has been received

Hi [CONTACT_NAME],

Thank you for applying to work with Invegent.

We've received your application for the [PACKAGE_LABEL] package.
Our team will review your details within 1–2 business days and
be in touch at this email address.

If you have any questions in the meantime, please email
hello@invegent.com.

Warm regards,
Parveen Kumar
Invegent
```

Resend sender: `onboarding@invegent.com` (alias already configured, routes to pk@invegent.com)
Resend API key: stored as Edge Function secret `RESEND_API_KEY`

### 7. Middleware update

Update `middleware.ts` to exclude `/onboard` and `/onboard/*` from auth redirect.
The onboarding form is public — no login required.

### 8. SECURITY DEFINER function for onboarding insert

Create a migration `add_onboarding_insert_fn.sql`:

```sql
CREATE OR REPLACE FUNCTION public.submit_onboarding(
  p_data JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO c.onboarding_submission (
    contact_name, contact_email, contact_phone, contact_role,
    business_name, abn, website_url, business_state,
    industry_vertical, industry_detail,
    facebook_page_url, instagram_url, linkedin_url, youtube_channel_url,
    current_followers, brand_voice, content_topics, content_exclusions,
    publishing_preference, blackout_awareness, has_brand_assets,
    desired_platforms, reporting_cadence,
    selected_package_code, selected_package_id,
    agreement_accepted, agreement_accepted_at, agreement_signed_name,
    agreement_signed_ip, agreement_version
  ) VALUES (
    p_data->>'contact_name', p_data->>'contact_email',
    p_data->>'contact_phone', p_data->>'contact_role',
    p_data->>'business_name', p_data->>'abn',
    p_data->>'website_url', p_data->>'business_state',
    p_data->>'industry_vertical', p_data->>'industry_detail',
    p_data->>'facebook_page_url', p_data->>'instagram_url',
    p_data->>'linkedin_url', p_data->>'youtube_channel_url',
    p_data->>'current_followers', p_data->>'brand_voice',
    ARRAY(SELECT jsonb_array_elements_text(p_data->'content_topics')),
    p_data->>'content_exclusions', p_data->>'publishing_preference',
    (p_data->>'blackout_awareness')::boolean,
    (p_data->>'has_brand_assets')::boolean,
    ARRAY(SELECT jsonb_array_elements_text(p_data->'desired_platforms')),
    p_data->>'reporting_cadence',
    p_data->>'selected_package_code',
    (p_data->>'selected_package_id')::uuid,
    (p_data->>'agreement_accepted')::boolean,
    NOW(),
    p_data->>'agreement_signed_name',
    p_data->>'agreement_signed_ip',
    p_data->>'agreement_version'
  ) RETURNING submission_id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_onboarding(JSONB) TO anon;
```

Note: `anon` role needs execute so the public form can submit without auth.
The function validates via SECURITY DEFINER — it only writes to c.onboarding_submission,
so the risk surface is limited.

## File List Expected

```
supabase/functions/onboarding-notifier/index.ts   (new)
app/onboard/page.tsx                              (new)
app/onboard/OnboardingForm.tsx                    (new)
actions/onboarding.ts                             (new)
lib/supabase/public.ts                            (new)
lib/agreement-text.ts                             (new)
middleware.ts                                     (update — exclude /onboard)
```

Plus one Supabase migration for `submit_onboarding` SECURITY DEFINER function.

## Definition of Done

1. `portal.invegent.com/onboard` loads without login
2. All 7 steps navigate correctly with validation
3. Step 6 shows real package data from DB
4. Step 7 shows agreement with package details pre-filled, signed name validation works
5. Submit creates a row in `c.onboarding_submission` — verify with SQL
6. Operator notification email arrives at `onboarding@invegent.com`
7. Client confirmation email arrives at the submitted address (use a test email)
8. `/onboard` is not redirected to login by middleware

## Test Submission

After building, submit a test using:
- Name: Test Client
- Email: pk+onboardtest@invegent.com
- Business: Care for Welfare Test
- Package: Starter
- Sign with: Test Client

Verify the row appears in:
```sql
SELECT submission_id, contact_name, business_name,
       selected_package_code, status, submitted_at
FROM c.onboarding_submission
ORDER BY submitted_at DESC LIMIT 5;
```
