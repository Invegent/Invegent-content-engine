# ICE — Tools Register

**Purpose:** Daily operational reference for every tool, service, and bridge that ICE depends on. Sits alongside `00_sync_state.md` and `00_action_list.md`.

**When to read this:** When something is "not working" and you're not sure which component is failing, or when you need to know what each tool does without digging through briefs.

**Last reviewed:** 2026-05-11

There are **three categories**. Confusion usually comes from blurring them.

---

## Category 1 — MCP servers (tools chat calls)

Tools available in a Claude conversation. They sit between chat and the outside world.

| Tool | What it does | Connected via | Notes |
|---|---|---|---|
| **Supabase MCP** | Run SQL (`execute_sql` read; `apply_migration` for DDL), read EF source (`get_edge_function`), pull EF logs (`get_logs`) | First-party Supabase MCP server | Primary DB access |
| **Invegent GitHub MCP** | Read-only access to whitelisted Invegent repos (`get_file_contents`, `list_directory`, `list_recent_commits`) | Custom bridge EF (`mcp-github-bridge` v5) | Cheap, whitelisted; default for routine repo reads |
| **github MCP** (generic) | Full GitHub API — issues, PRs, commits, search; not Invegent-locked | Local binary `C:\Users\parve\github-mcp-server\github-mcp-server.exe` | Use for writes (commits) and cross-org reads |
| **ChatGPT Review MCP** (`ask_chatgpt_review`) | The D-01 review tool — gates destructive actions through gpt-4o-mini | Custom bridge EF (`mcp-chatgpt-bridge` v9) | Sensitive to OAuth re-auth; see "Operational disambiguation" below |
| **Google Calendar MCP** | Calendar event read/write | First-party | |
| **Google Drive MCP** | Drive file read/search | First-party | |
| **Gmail MCP** | Gmail search/draft | First-party | |
| **Vercel MCP** | Deploys, projects, runtime logs | First-party | |
| **Microsoft 365 MCP** | Teams/Outlook/SharePoint | First-party | Rarely used |
| **Windows MCP** | PowerShell + file ops on the Windows box at `C:\Users\parve\Invegent-content-engine` | First-party | Times out on long-running CLI like `supabase functions deploy` — run those manually |
| **Zapier MCP** | 8000+ third-party app actions | First-party | LinkedIn fallback path lives here |
| **Web search / web fetch / image search** | Browser-class tools | Built-in | |

**Note:** the MCP registry locks at session start. New MCP connections require a new conversation. Re-auth flows that don't complete leave the MCP in a 401 loop (see Operational disambiguation).

---

## Category 2 — Supabase Edge Functions (tools inside the pipeline)

These run **inside Supabase**. They're the ICE pipeline itself. Triggered by pg_cron, webhooks, or HTTP calls — not by chat directly (chat just calls them via Supabase MCP to apply migrations or read state).

Source of truth: `supabase/functions/` directory + `supabase/config.toml`.

### 2.1 Pipeline workers (ingest → draft → publish)

| EF | Purpose | Trigger |
|---|---|---|
| `ingest` | Pull RSS feeds → `f.raw_content_item` | cron |
| `email-ingest` | Inbound emails via Gmail OAuth → raw_content_item | cron |
| `content_fetch` | Full-text extraction (Jina reader) → `f.canonical_content_body` | cron |
| `feed-discovery` | Discover new feed candidates | cron |
| `feed-intelligence` | Score feed quality, flag stale/dead feeds | cron |
| `ai-worker` | Generate drafts from digest items via Claude/OpenAI | cron |
| `auto-approver` | Score drafts vs client profile rules; auto-approve | cron |
| `compliance-monitor` / `compliance-reviewer` | NDIS / legal compliance checks on drafts | cron |
| `image-worker` | Creatomate carousel image generation | cron |
| `video-worker` | Video composition orchestrator (calls heygen-worker) | cron |
| `heygen-worker` | HeyGen avatar API calls | cron |
| `publisher` | Push approved drafts to platforms | cron (×2) |
| `linkedin-zapier-publisher` | LinkedIn fallback via Zapier (pre-Community API approval) | cron |
| `youtube-publisher` | YouTube publish | cron |
| `wordpress-publisher` | WordPress publish | cron |

### 2.2 Reconciliation (PRV-1 — being built)

| EF | Purpose | Status |
|---|---|---|
| `cadence-rule-generator` | Generate `r.expected_publication` rows from `c.client_cadence_rule` | **Not yet deployed** (cc-0009 Stage B+C) |
| `ice-evidence-materialiser` | Materialise ICE-side evidence rows | Future (cc-0010) |
| `reconciliation-matcher` | Match expected ↔ observed publications | Future (cc-0010) |
| `cadence-drift-checker` | Detect drift between cadence rule and reality | Future (cc-0011) |
| `facebook-observer` / `instagram-observer` / `linkedin-observer` / `youtube-observer` | Platform observation for evidence | Future (PRV-2/3/4) |

### 2.3 Monitoring & analytics

| EF | Purpose | Trigger |
|---|---|---|
| `pipeline-doctor` | Pipeline health checks | cron |
| `pipeline-sentinel` | Stuck-job + lock detection | cron |
| `pipeline-healer` | Auto-remediation of common stuck states | cron |
| `pipeline-fixer` | Higher-tier remediation | cron |
| `pipeline-ai-summary` | AI summary of pipeline state for dashboard | cron |
| `ai-diagnostic` | Self-diagnostic of AI pipeline | cron |
| `drift-check` | Cross-publisher drift check | cron |
| `insights-worker` | Pull post performance from FB Graph API | cron |
| `insights-feedback` | Feed performance back into scoring | cron |
| `client-weekly-summary` | Generate weekly client digests | cron |
| `weekly-manager-report` | Internal weekly ops report | cron |
| `draft-notifier` | Telegram/email alerts on flagged drafts | cron |

### 2.4 Review & governance

| EF | Purpose | Trigger |
|---|---|---|
| `external-reviewer` | Post-commit code review (Gemini 2.5 Pro + GPT-4o + Grok 4.1 Fast) | GitHub webhook |
| `external-reviewer-digest` | Weekly digest of reviewer findings | cron |
| `chatgpt-review-worker` | Backend for `ask_chatgpt_review` MCP | Called by mcp-chatgpt-bridge |
| `mcp-chatgpt-bridge` | OAuth + JSON-RPC server fronting the ChatGPT review tool | MCP client (Claude.ai) |
| `mcp-github-bridge` | OAuth + JSON-RPC server fronting Invegent GitHub access | MCP client (Claude.ai) |

**Total: ~32 EFs.**

---

## Category 3 — External services & dashboards

Tools that **aren't EFs and aren't MCPs** — separate hosted things.

| Service | What it is | URL / Where |
|---|---|---|
| **invegent-dashboard** | Operations dashboard (Next.js on Vercel) | `dashboard.invegent.com` |
| **invegent-portal** | Client-facing portal (Next.js on Vercel) | `portal.invegent.com` |
| **invegent-web** | Public marketing site (Next.js on Vercel) | `invegent.com` |
| **Cowork** | Desktop tool — nightly health checks (02:00 AEST), weekly reconciliation (Mon 7am AEST) | Local desktop (PK's machine) |
| **Claude Code** | CLI agent for code work | PowerShell from `C:\Users\parve\Invegent-content-engine` |
| **Supabase Dashboard** | Manual SQL editor, vault, table viewer | `supabase.com/dashboard/project/mbkmaxqhsohbtwsqolns` |
| **GitHub Invegent org** | 3 repos: `Invegent-content-engine`, `invegent-dashboard`, `invegent-portal` | `github.com/Invegent` |
| **Vercel team** | Hosting all 3 Next.js apps | `vercel.com/pk-2528s-projects` |
| **Meta App: Invegent Publisher** | OAuth + permissions for FB/IG | Meta Developer Portal |
| **LinkedIn App** | Community API (pending) | LinkedIn Developer Portal (App ID `78im589pktk59k`) |
| **Resend** | Email delivery (`feeds@invegent.com`, magic links) | resend.com |
| **Creatomate** | Image carousel generation ($54/mo Essential) | creatomate.com |
| **HeyGen** | Video avatar generation | heygen.com |
| **Anthropic Claude API** | Primary AI for drafts | console.anthropic.com |
| **OpenAI API** | Fallback AI + gpt-4o-mini for ChatGPT Review | platform.openai.com |
| **Google Workspace** | Gmail OAuth (`feeds@invegent.com`) | admin.google.com |
| **Zapier** | LinkedIn fallback publisher | zapier.com |

---

## Operational disambiguation

When something "isn't working," check which of these you actually mean:

### "ChatGPT review is not working"

Two completely different systems share the "AI review" framing:

| Component | Role | Failure mode |
|---|---|---|
| **`mcp-chatgpt-bridge`** (Cat 2 EF) | OAuth + JSON-RPC server that takes `ask_chatgpt_review` calls from chat and routes them to `chatgpt-review-worker` (which calls gpt-4o-mini). | **D-01 gate down.** Returns 401 if OAuth re-auth is incomplete (no JWT minted for the current MCP client_id). Fix: complete consent flow at `dashboard.invegent.com/mcp-consent` OR disconnect + reconnect MCP in Claude.ai. |
| **`external-reviewer`** (Cat 2 EF) | Post-commit GitHub webhook reviewer using Gemini 2.5 Pro + GPT-4o + Grok 4.1 Fast. Writes findings to `m.external_review_queue`. | Provider-API failure (5xx, rate limit, refusal). Does NOT affect D-01 gating. |

Both involve "AI reviewing things." They are independent systems with different triggers, different downstream models, and different failure modes. **Always name the EF, not "ChatGPT review."**

### "GitHub is not working"

| Component | Role |
|---|---|
| **Invegent GitHub MCP** | Whitelisted repo reads via `mcp-github-bridge` EF |
| **github MCP** (generic) | Full GitHub API via local binary; used for writes |
| **GitHub Actions / webhooks** | Trigger `external-reviewer` on push to main |
| **GitHub PAT** | Stored in Claude Code settings; rotates manually |

### "Publisher is not working"

| Component | Role |
|---|---|
| **`publisher` EF** | Routes approved drafts to FB Graph API |
| **`linkedin-zapier-publisher` EF** | LinkedIn fallback via Zapier (pre-Community API approval) |
| **`youtube-publisher` EF** | YouTube publish |
| **`wordpress-publisher` EF** | WordPress publish |
| **Meta page tokens** | Stored in `c.client_publish_profile.page_access_token`; expire ~60 days |

---

## Health checks at a glance

| Symptom | Most likely cause | Check |
|---|---|---|
| MCP returns 401 | OAuth re-auth incomplete | `SELECT * FROM m.mcp_oauth_client WHERE last_used_at IS NULL ORDER BY created_at DESC` |
| D-01 fire produces no `m.chatgpt_review` row | `mcp-chatgpt-bridge` 401 OR `chatgpt-review-worker` down | EF logs filtered to `mcp-chatgpt-bridge` then `chatgpt-review-worker` |
| Publishing stopped for one client | Token expired OR queue locked | Dashboard → Overview tab → Token Health AND `m.post_publish_queue` lock state |
| Publishing stopped for all clients | Meta API outage OR rate limit OR app-level issue | `Supabase:get_logs service=edge-function` filtered to publisher |
| Drafts not generating | `ai-worker` errored OR AI provider rate-limited | `m.ai_job` for non-completed rows + ai-worker logs |
| Cron silently stopped | Job paused OR command malformed | `SELECT * FROM cron.job WHERE jobname = '<name>'` + `cron.job_run_details` |

---

## Maintenance

This register is reviewed when:
- A new EF is deployed (add to Cat 2)
- A new MCP is connected (add to Cat 1)
- A new external service is integrated (add to Cat 3)
- A failure pattern recurs (add to Operational disambiguation)

Trivial drift (version bumps within a stable EF) is not tracked here — `00_sync_state.md` covers that.
