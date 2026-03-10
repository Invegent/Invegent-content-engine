# ICE — Client Onboarding SOP

## Purpose

This document is the step-by-step process for taking a new client
from "yes" to publishing. Follow it in order. Do not skip steps.
Every skipped step creates a problem that takes longer to fix later
than it would have taken to do correctly at the start.

---

## Before You Start: Pre-Onboarding Checklist

Before confirming a start date with a new client, verify ALL of the
following are true:

- [ ] ICE pipeline is stable — both existing clients publishing consistently
- [ ] Meta App Review is complete — production API access confirmed
      (not development tier)
- [ ] You have capacity to complete onboarding within 2 weeks
- [ ] Client has a Facebook Page with admin access they can grant
- [ ] Contract or agreement signed (see Section 8)
- [ ] First invoice sent or payment method confirmed

Do not start onboarding until all boxes are checked.

---

## Step 1 — Client Identity Setup
**Timeline:** Day 1 | Owner: Invegent

Create the client record in the database:

```sql
-- Run in Supabase SQL editor
INSERT INTO c.client (
  name,
  slug,
  timezone,
  status
) VALUES (
  'Client Name Here',
  'client-slug',        -- lowercase, hyphenated, no spaces
  'Australia/Sydney',   -- or client's actual timezone
  'onboarding'          -- use 'onboarding' not 'active' until publishing confirmed
);
```

Record the generated client_id — you will need it for every subsequent step.

**Deliverable:** client_id confirmed in database.

---

## Step 2 — Content Scope Configuration
**Timeline:** Day 1–2 | Owner: Invegent

Identify which content verticals apply to this client and configure
their content scope. This determines what signals ICE monitors and
what content it produces.

**For an NDIS provider, typical scope includes:**
- NDIS (primary)
- Disability Services (parent vertical)
- Health Policy (relevant regulation)
- Allied Health (if OT/physio/speech)
- Mental Health (if applicable to their practice)

**For a property professional, typical scope includes:**
- AU Residential Property (primary)
- AU Mortgage & Lending (if broker)
- RBA / Interest Rates
- Property Investment

Insert rows into c.client_content_scope linking the client to
the relevant t.content_vertical IDs.

Confirm with client: share the list of verticals and ask them
to flag anything missing or irrelevant. One email is sufficient.

**Deliverable:** content scope configured and confirmed with client.

---

## Step 3 — Brand Profile Build
**Timeline:** Day 2–3 | Owner: Invegent (with client input)

This is the most important step. A weak brand profile produces
weak content. Do not rush it.

**Information to gather from the client (discovery call or written brief):**

- Business name and how they refer to themselves
- Who is the "voice" behind the page — the founder, a named persona,
  or the business as a whole?
- How do they describe their audience? Who follows this page?
- What 3–5 words describe their communication style?
- What do they never want to say or imply on social media?
- Do they have existing brand guidelines, a website about page,
  or marketing materials? If yes, ask for them.
- What compliance context applies? (e.g. NDIS Code of Conduct,
  financial services disclaimer, professional registration requirements)
- What disclaimer do they use when discussing their area of practice?

**Then build the brand profile:**

```sql
INSERT INTO c.client_brand_profile (
  client_id,
  brand_name,
  brand_bio,
  presenter_identity,
  core_expertise,
  audience_description,
  audience_is_dynamic,
  brand_voice_keywords,
  brand_values,
  brand_never_do,
  compliance_context,
  disclaimer_template,
  model,
  temperature,
  max_output_tokens,
  is_active,
  version
) VALUES (
  '[client_id]',
  '[brand name]',
  '[2-3 sentence brand bio]',
  '[who is speaking — role, insider credentials, perspective]',
  '[what they are expert in]',
  '[who follows this page and why]',
  true,  -- most NDIS pages serve both participants/families AND providers
  ARRAY['word1', 'word2', 'word3'],
  '[what the brand believes and stands for]',
  ARRAY['never do this', 'never say this'],
  '[compliance context specific to their profession/sector]',
  '[their standard disclaimer text]',
  'claude-sonnet-4-6',
  0.72,   -- NDIS clients: 0.72 | property clients: 0.68
  1200,
  true,
  1
);
```

Do not guess the brand voice. If you do not have enough information
to write a confident brand_identity_prompt, ask the client.
One bad brand profile produces months of mediocre content.

**Deliverable:** brand profile row inserted and reviewed.
Read back the presenter_identity and brand_never_do to the client
and confirm they recognise their voice in it.

---

## Step 4 — Platform Profile Configuration
**Timeline:** Day 3 | Owner: Invegent

Create platform profiles for the client. At minimum, Facebook.
LinkedIn if included in their tier. Other platforms as contracted.

For Facebook, insert:

```sql
INSERT INTO c.client_platform_profile (
  client_id,
  platform,
  platform_voice_notes,
  register,
  max_chars,
  min_chars,
  emoji_level,
  use_hashtags,
  hashtag_count,
  use_markdown,
  structure_notes,
  is_active,
  version
) VALUES (
  '[client_id]',
  'facebook',
  '[any Facebook-specific notes for this client]',
  'conversational',
  400,
  120,
  'minimal',
  false,
  0,
  false,
  'Ends with a specific question. No bullet lists. No headers. Starts with an insight.',
  true,
  1
);
```

Create inactive stub rows for other platforms
(linkedin, instagram, youtube, newsletter, blog, reddit)
so they exist and can be activated without a new INSERT later.

**Deliverable:** platform profiles inserted. Facebook active.
All other platforms inactive stubs present.

---

## Step 5 — Content Type Prompts
**Timeline:** Day 3–4 | Owner: Invegent

Insert the task prompts for each active job type.
For a standard onboarding, this means:
- rewrite_v1 (Facebook) — single signal rewrite
- synth_bundle_v1 (Facebook) — multi-signal synthesis

Use the existing NDIS Yarns or Property Pulse prompts as templates
and adapt for the new client's specific compliance and voice requirements.

After inserting, run a manual test: trigger a single ai_job for this
client and review the output before enabling auto-approval.

**Deliverable:** content type prompts inserted. Test draft reviewed
and quality confirmed acceptable before moving to next step.

---

## Step 6 — Feed Source Assignment
**Timeline:** Day 4–5 | Owner: Invegent

Assign feed sources to the new client. Start with feeds that are already
active and performing well for the same vertical. Do not add
new feeds at onboarding — use proven sources first.

**For NDIS clients, start with:**
- DSS newsletter feeds (consistently high quality)
- Summer Foundation
- Inclusion Australia
- NDIS sector news aggregators
- Relevant state government disability feeds

**For property clients, start with:**
- CoreLogic commentary feeds
- RBA media releases
- REIA reports
- PropTrack research

Insert into c.client_source:

```sql
INSERT INTO c.client_source (client_id, feed_source_id, weight)
VALUES
  ('[client_id]', '[feed_source_id]', 1.0),  -- primary sources weight 1.0
  ('[client_id]', '[feed_source_id]', 0.8),  -- secondary sources weight 0.8
  ...
;
```

Target: minimum 8 active feeds at onboarding. 12 is the operational target.

**Deliverable:** feed sources assigned and confirmed active.

---

## Step 7 — Facebook Page Connection
**Timeline:** Day 5–7 | Owner: Client (guided by Invegent)

This step requires action from the client. Handle it carefully —
the token process can be confusing and losing a token mid-onboarding
creates delays.

**What the client needs to do:**
1. They must be an admin of their Facebook Page
2. They need to authorise the Invegent Publisher app to manage their page
3. This generates a long-lived page access token

**What you do with the token:**
1. Store the token in c.client_publish_profile:

```sql
INSERT INTO c.client_publish_profile (
  client_id,
  platform,
  mode,
  page_access_token,
  page_id,
  page_name,
  token_expires_at,
  publishing_enabled,
  boost_enabled
) VALUES (
  '[client_id]',
  'facebook',
  'staging',            -- START IN STAGING. Change to 'auto' only after test publish confirmed.
  '[token]',
  '[page_id]',
  '[page_name]',
  '[expiry_date]',      -- Long-lived tokens expire in ~60 days. Calendar reminder required.
  true,
  false                 -- Boost off until Standard Access confirmed
);
```

2. Do a test publish: manually push one draft to confirm the connection works.
   Check the post appears on their page. Then delete the test post.
3. Switch mode from 'staging' to 'auto'.

**Important:** Set a calendar reminder 50 days after token issue to
notify the client that their token will expire soon. Token expiry
is the most common cause of publishing stalls.

**Deliverable:** Facebook page connected. Test post confirmed.
Mode switched to 'auto'. Token expiry reminder set.

---

## Step 8 — Auto-Approval Configuration
**Timeline:** Day 5–6 | Owner: Invegent

Configure the auto-approver settings for this client in c.client_ai_profile
(the auto-approver still reads from this table for its gate logic):

- auto_approve_enabled: true
- auto_approve_score_threshold: start at 0.65 and adjust based on output quality
- keyword_blocklist: add any client-specific terms that should never appear

For the first two weeks, run in manual review mode (check every draft
before it publishes). Once you are confident the output quality is
consistent, enable auto-approval and drop to the weekly review routine.

**Deliverable:** auto-approver configured. Manual review period begun.

---

## Step 9 — Publishing Profile Configuration
**Timeline:** Day 7 | Owner: Invegent

Configure the client's digest policy (how content is selected for them):

```sql
INSERT INTO c.client_digest_policy (
  client_id,
  selection_mode,
  min_score,
  max_items_per_digest,
  lookback_hours
) VALUES (
  '[client_id]',
  'balanced',   -- 'strict' for clients needing tighter content control
  0.6,
  5,
  48
);
```

Set posts per week target: default 5 for Standard tier, 3 for Starter.

**Deliverable:** digest policy configured. Publishing schedule active.

---

## Step 10 — Welcome and First Week Review
**Timeline:** Day 7–14 | Owner: Invegent

**Day 7:** Send client a welcome message with:
- Confirmation that ICE is live on their page
- Link to their Facebook page so they can see what's publishing
- Explanation of what to expect in the first two weeks
  (slightly more active review from our side while we calibrate)
- How to contact you if they want to flag content for adjustment
- When their first invoice is due (if not already paid)

**Day 7–14:** Review every draft manually before it publishes.
Look for:
- Brand voice misalignment (does it sound like them?)
- Compliance issues (anything that crosses advice/information line)
- Relevance gaps (is it covering the right topics?)
- Format issues (markdown slipping through, wrong length)

Adjust the brand profile or content type prompts if needed.
This is the calibration window — use it.

**Day 14:** Switch to standard weekly review.
Send client a brief check-in: "First two weeks live — here's what we
published, any feedback?"

**Deliverable:** first 14 days reviewed and calibrated.
Client received and acknowledged welcome message.
Any feedback addressed.

---

## Step 11 — Cross-Promotion Setup (NDIS clients only)
**Timeline:** Day 14 | Owner: Invegent

For NDIS clients, initiate the cross-promotion network protocol:

1. Welcome post on NDIS Yarns featuring the new client:
   "Welcome to [Client Name] — [brief description of their service
   and who they help]. We're excited to share their page with
   the NDIS community. Follow them at [link]."

2. Ask client to share the NDIS Yarns welcome post to their page.

3. Tag the client page in the post (requires their page to be public).

4. Schedule a spotlight post for 4 weeks after go-live:
   a deeper feature of the client's story and approach.

This is not optional. The cross-promotion network is part of the
service model and creates the audience flywheel that grows both pages.

**Deliverable:** welcome post published. Spotlight post scheduled.

---

## Step 12 — Steady State Handover
**Timeline:** Day 14 | Owner: Invegent

Once the calibration window is complete:

- Switch fully to auto-approval (if not already done)
- Drop to weekly review routine (under 30 minutes per client per week)
- Set token expiry reminder (if not already set)
- Add client to monthly review checklist
- Update client status from 'onboarding' to 'active':

```sql
UPDATE c.client
SET status = 'active'
WHERE client_id = '[client_id]';
```

**Deliverable:** client status 'active'. Onboarding complete.

---

## Ongoing: Weekly Review Routine

Once a client is in steady state, the weekly routine is:

**Under 30 minutes per client:**
- Review any drafts flagged (not auto-approved) — approve, edit, or reject
- Check that posts are appearing on the page
- Scan the last week's published posts for any quality issues
- Check token health — is the token expiring soon?

**Monthly (first Monday of the month):**
- Review the monthly review checklist in 05_risks.md
- Check performance data — what's working?
- Any feed recommendations from the feed intelligence agent?
- Client check-in if on Premium tier (monthly report)

---

## Onboarding Timeline Summary

| Day | Step | Owner |
|-----|------|-------|
| 1 | Client record created | Invegent |
| 1–2 | Content scope configured | Invegent |
| 2–3 | Brand profile built | Invegent + Client |
| 3 | Platform profiles configured | Invegent |
| 3–4 | Content type prompts inserted and tested | Invegent |
| 4–5 | Feed sources assigned | Invegent |
| 5–7 | Facebook page connected and test published | Client + Invegent |
| 5–6 | Auto-approver configured | Invegent |
| 7 | Publishing profile configured | Invegent |
| 7–14 | Manual review calibration window | Invegent |
| 14 | Cross-promotion setup (NDIS) | Invegent |
| 14 | Steady state handover | Invegent |

Total elapsed time from contract to live: 7–10 business days.
Total Invegent time investment at onboarding: approximately 4–6 hours.

---

## Common Onboarding Problems and Fixes

**Brand profile too generic — output sounds like every other page**
Cause: not enough client-specific input in brand profile.
Fix: schedule a 30-minute discovery call specifically about voice.
Ask: "Read me three posts from your page that you're proud of."
That language goes into the profile.

**Token authorisation fails**
Cause: client is not a page admin, or authorised a personal profile
instead of the page.
Fix: walk the client through the Facebook page settings to confirm
their admin role before trying again.

**First drafts covering wrong topics**
Cause: content scope too broad or wrong verticals selected.
Fix: narrow the scope — remove low-relevance verticals.
A tighter scope produces higher relevance, not less content.

**Client says posts don't sound like them**
Cause: brand profile doesn't capture their actual voice.
Fix: ask the client to write one post themselves in their natural voice.
Use that as the reference to update presenter_identity and
brand_voice_keywords. One real example beats five adjective lists.

**Publishing stalls after a few days**
Cause: usually a token issue or a locked queue item.
Fix: check m.vw_ops_token_health and m.vw_ops_failures_24h in the dashboard.
