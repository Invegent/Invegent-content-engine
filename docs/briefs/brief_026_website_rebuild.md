# Claude Code Brief 026 — invegent.com Rebuild

**Date:** 13 April 2026
**Phase:** A — Revenue Readiness
**Repo:** `invegent-web` (Vercel project: `prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ`)
**Working directory:** `C:\Users\parve\invegent-web` (clone if needed)
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** GitHub MCP, Supabase MCP
**Estimated time:** 4–6 hours

---

## What this builds

invegent.com currently shows a 4-line HTML placeholder.
This brief replaces it with a world-class Next.js landing page targeting
NDIS providers — the first thing a prospect sees before agreeing to pay $800/month.

---

## Audience and positioning

**Who:** NDIS allied health providers — OT practices, physio, speech therapy,
support coordination, plan management. 2–20 staff. Founder-led. Know they should
post on social media, never have time, worried about compliance.

**The moat:** Built by a CPA who manages an NDIS allied health practice and holds
a plan management registration. No marketing agency can make this pitch. It belongs
in the hero.

**One CTA throughout:** Book a 20-minute demo.

---

## Page architecture — 8 sections

### Section 1 — Hero

```
Headline:    "Your NDIS practice posts every day.
              Without you touching it."

Subheadline: "ICE monitors NDIS sector signals, writes compliant social content
              in your voice, and publishes to Facebook and LinkedIn automatically.
              Built by an OT practice administrator — not a marketing agency."

CTA:         [Book a 20-minute demo →]

Proof strip: "14 posts published this week  ·  3 NDIS practices  ·  0 compliance flags"
             (live data pulled from Supabase public read)
```

Design: dark background (#0f172a), white text, cyan-400 accent. Clean, modern.
No stock photos. No animations that slow load. One focused CTA button.

### Section 2 — The problem

```
"You know you should be on social media."

• Every week you mean to post something about the new NDIS pricing.
• Every week something more urgent takes over.
• And when you do post, you're never quite sure if it's compliant.

"Your competitors are showing up. You're not."
```

Simple alternating text/accent layout. No images.

### Section 3 — How it works (3 steps)

```
① Signals        → ICE monitors NDIS.gov.au, DSS, peak bodies, and sector news daily.

② Drafts         → Our AI writes posts in your practice's voice, with compliance
                   rules built in. You review — or let it auto-publish.

③ Published      → Content goes live on your Facebook and LinkedIn pages
                   on a schedule that fits your audience.
```

Visual: three cards with icons, connected by a subtle arrow or line.

### Section 4 — Live proof

```
NDIS Yarns — our own page, running on ICE since January 2026:

[Posts published: 127]  [This week: 14]  [Compliance flags: 0]

[Show 3 recent post previews — title + first 120 chars + date]
```

Data source: Supabase public read API — query m.post_publish for client_id
`fb98a472-ae4d-432d-8738-2273231c1ef4` (NDIS Yarns). Revalidate every hour.

Caption: "This is our page. We built ICE to run it. It works for us every day.
It will work for you."

### Section 5 — Who built this

```
[PK photo placeholder — or initials avatar if no photo]

Parveen Kumar — CPA, NDIS Plan Manager,
Business Administrator at Care for Welfare (mobile OT practice)

"I built ICE because I was the person who needed it.
I know what NDIS providers can and cannot say publicly.
I know the Code of Conduct. I know the pricing arrangements.
I know the language that support coordinators respond to.

This is not a marketing tool. It is a compliance-aware content
system built from inside the sector."
```

This section is the hardest for any competitor to replicate. Lead with it.

### Section 6 — Pricing

```
Starter          Standard          Premium
$500/mo          $800/mo           $1,500/mo

3 posts/week     5 posts/week      Daily posts
Facebook         Facebook +        All platforms
                 LinkedIn
                                   Monthly report
                                   Campaign series

[Book a demo]    [Book a demo]     [Book a demo]
```

No "contact for pricing". Show it clearly. NDIS providers are used to
NDIA price guides — they respect transparency.

### Section 7 — FAQ (5 questions)

```
Q: Is this compliant with the NDIS Code of Conduct?
A: Yes. Every post is checked against NDIS-specific compliance rules before
   publishing. We flag anything sensitive for your review.

Q: Do I need to review every post?
A: Your choice. Most clients let ICE auto-publish. If you want to review
   first, you can approve from your phone in 30 seconds.

Q: What platforms does ICE post to?
A: Facebook now. LinkedIn coming soon (pending API approval). Email and
   your website in development.

Q: How long does setup take?
A: 30 minutes. Fill in your practice details, connect your Facebook page,
   and ICE starts generating content the same day.

Q: Is there a contract?
A: Monthly. Cancel any time.
```

Accordion style. Closed by default.

### Section 8 — Final CTA

```
"Ready to show up for your NDIS community?"

"Book a 20-minute demo. We'll show you your practice's
first week of content — live — before you commit to anything."

[Book a 20-minute demo →]

Email: hello@invegent.com
ABN: 39 769 957 807  ·  NSW, Australia
```

---

## Task 1 — Check repo structure

Clone or pull `invegent-web` from the Invegent GitHub org.
Check what currently exists. It may be a minimal Next.js app or a static HTML file.
If it's static HTML, scaffold a new Next.js 14 app with App Router.

---

## Task 2 — Live data server component

Create `lib/proof-stats.ts` that fetches from Supabase service role:

```typescript
import { createServiceClient } from './supabase/service';

export async function getNDISYarnsProofStats() {
  const supabase = createServiceClient();
  const NDIS_YARNS_ID = 'fb98a472-ae4d-432d-8738-2273231c1ef4';

  const [publishCount, weekCount, recentPosts] = await Promise.all([
    supabase.schema('m').from('post_publish')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', NDIS_YARNS_ID),
    supabase.schema('m').from('post_publish')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', NDIS_YARNS_ID)
      .gte('published_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.rpc('exec_sql', {
      query: `SELECT pd.draft_title, LEFT(pd.draft_body, 120) AS preview, pp.published_at
              FROM m.post_publish pp
              JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
              WHERE pp.client_id = '${NDIS_YARNS_ID}'
              ORDER BY pp.published_at DESC LIMIT 3`
    })
  ]);

  return {
    totalPublished: publishCount.count ?? 0,
    publishedThisWeek: weekCount.count ?? 0,
    complianceFlags: 0, // always 0 by design
    recentPosts: (recentPosts.data ?? []) as Array<{
      draft_title: string;
      preview: string;
      published_at: string;
    }>,
  };
}
```

Use `export const revalidate = 3600;` on pages that use this data.

---

## Task 3 — Build the page

**File:** `app/page.tsx`

Build all 8 sections as described above. Key technical requirements:
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Dark hero (#0f172a bg), rest of page white/slate-50
- Mobile-first — sidebar hero stacks vertically on mobile
- No external animation libraries — use Tailwind transitions only
- Accessibility: proper heading hierarchy, alt text, focus states
- Page load < 2 seconds — no heavy dependencies
- No navbar beyond logo + "Book a demo" button top-right
- Footer: Privacy Policy link (→ /privacy), ABN, email, copyright

---

## Task 4 — Privacy policy page

**File:** `app/privacy/page.tsx`

Render the existing privacy policy from `docs/Invegent_Privacy_Policy.md`.
Simple page, same design system. No raw markdown — render as formatted HTML.

---

## Task 5 — Deploy

```bash
cd C:\Users\parve\invegent-web
npm run build
git add -A
git commit -m "feat: invegent.com full rebuild — NDIS-focused landing page with live proof stats"
git push origin main
```

Vercel auto-deploys to invegent.com. Confirm:
- Page loads without error
- Live proof stats render (total published, this week)
- Mobile layout correct
- Privacy policy page accessible at /privacy

---

## Task 6 — Write result file

Write `docs/briefs/brief_026_result.md` in Invegent-content-engine:
- Repo structure found
- All 8 sections built
- Live data working (post counts)
- Build: PASS/FAIL
- Commit SHA
- invegent.com live confirmation

---

## Error handling

- If invegent-web doesn't exist as a repo: create it in the Invegent org, scaffold Next.js 14 with `create-next-app`, push, then set up Vercel project
- If exec_sql RPC not accessible from the web app (different service role setup): fall back to hardcoded proof numbers for now — "127 posts published, 14 this week"
- The NDIS Yarns client_id is hardcoded for the proof section — this is correct, it's always our own page
- "Book a demo" button: link to `mailto:hello@invegent.com?subject=ICE Demo Request` for now. Calendly link can replace it later.
- No auth, no portal link, no dashboard link on this page — it's public marketing only

## What this does NOT include

- Blog / content section
- Case study pages
- Calendly integration (use mailto for now)
- A/B testing
- Analytics (add later)
