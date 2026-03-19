import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "email-ingest-v1";

function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { db: { schema: "f" } });
}

async function refreshAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GMAIL_CLIENT_ID")!,
      client_secret: Deno.env.get("GMAIL_CLIENT_SECRET")!,
      refresh_token: Deno.env.get("GMAIL_REFRESH_TOKEN")!,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) { const body = await res.text(); throw new Error(`Token refresh ${res.status}: ${body}`); }
  const data = await res.json();
  if (!data.access_token) throw new Error("No access_token in token response");
  return data.access_token as string;
}

async function getLabelId(token: string, labelName: string): Promise<string | null> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const data = await res.json();
  const found = (data.labels ?? []).find((l: { name: string; id: string }) => l.name === labelName);
  return found?.id ?? null;
}

async function listUnreadMessageIds(token: string, labelId: string): Promise<string[]> {
  const params = new URLSearchParams({ labelIds: labelId, q: "is:unread", maxResults: "50" });
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.messages ?? []).map((m: { id: string }) => m.id);
}

async function fetchFullMessage(token: string, messageId: string): Promise<unknown> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Fetch message ${messageId}: ${res.status}`);
  return res.json();
}

async function markAsRead(token: string, messageId: string): Promise<void> {
  await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
  });
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string | null {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function decodeBase64Url(data: string): string {
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  try { return atob(b64 + "=".repeat(pad)); } catch { return ""; }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    return payload.mimeType === "text/html" ? stripHtml(decoded) : decoded;
  }
  const parts: any[] = payload.parts ?? [];
  for (const part of parts) { if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64Url(part.body.data); }
  for (const part of parts) { if (part.mimeType === "text/html" && part.body?.data) return stripHtml(decodeBase64Url(part.body.data)); }
  for (const part of parts) { if (part.mimeType?.startsWith("multipart/")) { const body = extractBody(part); if (body) return body; } }
  return "";
}

const LABEL_CONFIGS = [
  { labelName: "newsletter/ndis", sourceIdentifier: "email:newsletter/ndis" },
  { labelName: "newsletter/property", sourceIdentifier: "email:newsletter/property" },
];

Deno.serve(async (_req: Request) => {
  const supabase = getSupabase();
  const errors: string[] = [];
  let totalProcessed = 0;
  let totalSkipped = 0;

  let accessToken: string;
  try { accessToken = await refreshAccessToken(); }
  catch (e: any) { return Response.json({ ok: false, error: `Token refresh failed: ${e?.message ?? String(e)}` }, { status: 500 }); }

  const { data: allSources } = await supabase
    .from("feed_source")
    .select("source_id, collection_region_key, default_content_region_key, config")
    .eq("source_type_code", "email_newsletter")
    .eq("status", "active");

  for (const lc of LABEL_CONFIGS) {
    const source = (allSources ?? []).find((s: any) => s.config?.source_identifier === lc.sourceIdentifier);
    if (!source) { errors.push(`No active feed_source found for identifier: ${lc.sourceIdentifier}`); continue; }

    const labelId = await getLabelId(accessToken, lc.labelName);
    if (!labelId) { errors.push(`Gmail label not found: ${lc.labelName}`); continue; }

    const messageIds = await listUnreadMessageIds(accessToken, labelId);
    if (messageIds.length === 0) continue;

    let runId: string;
    const { data: runRow, error: runErr } = await supabase
      .from("ingest_run")
      .insert({ source_id: source.source_id, status: "running", trigger_type: "schedule", ingestor_version: VERSION, notes: `email-ingest label=${lc.labelName} count=${messageIds.length}`, collection_region_key: source.collection_region_key, default_content_region_key: source.default_content_region_key })
      .select("run_id")
      .single();

    if (runErr || !runRow?.run_id) { console.warn("ingest_run insert failed:", runErr?.message); runId = crypto.randomUUID(); }
    else { runId = runRow.run_id as string; }

    let labelProcessed = 0;
    let labelSkipped = 0;

    for (const messageId of messageIds) {
      let markRead = false;
      try {
        const msg: any = await fetchFullMessage(accessToken, messageId);
        const headers: Array<{ name: string; value: string }> = msg.payload?.headers ?? [];
        const subject = getHeader(headers, "Subject") ?? "(no subject)";
        const sender = getHeader(headers, "From") ?? null;
        const dateStr = getHeader(headers, "Date");
        let publishedAt: string | null = null;
        if (dateStr) { const d = new Date(dateStr); if (!isNaN(d.getTime())) publishedAt = d.toISOString(); }
        const bodyText = extractBody(msg.payload ?? {});
        const bodyTrunc = bodyText.slice(0, 5000);
        const { error: insertErr } = await supabase.from("raw_content_item").insert({ source_id: source.source_id, run_id: runId, external_id: messageId, title: subject, url: null, published_at: publishedAt, payload: { subject, sender, body: bodyTrunc, gmail_message_id: messageId, label: lc.labelName }, summary: bodyTrunc.slice(0, 500) || null, collection_region_key: source.collection_region_key, content_region_key: source.default_content_region_key });
        if (insertErr) {
          const errMsg = (insertErr as any).message ?? "";
          const isDup = errMsg.toLowerCase().includes("duplicate") || errMsg.toLowerCase().includes("unique");
          if (isDup) { labelSkipped++; markRead = true; } else { errors.push(`[${lc.labelName}] ${messageId}: ${errMsg}`); }
        } else { labelProcessed++; markRead = true; }
      } catch (e: any) { errors.push(`[${lc.labelName}] ${messageId}: ${e?.message ?? String(e)}`); }
      if (markRead) await markAsRead(accessToken, messageId);
    }

    if (runRow?.run_id) {
      const labelErrors = errors.filter((e) => e.startsWith(`[${lc.labelName}]`)).length;
      await supabase.from("ingest_run").update({ status: labelErrors > 0 ? "partial" : "success", ended_at: new Date().toISOString(), fetched_count: messageIds.length, inserted_count: labelProcessed, skipped_count: labelSkipped, updated_count: 0, error_count: labelErrors }).eq("run_id", runId);
    }
    totalProcessed += labelProcessed;
    totalSkipped += labelSkipped;
  }

  return Response.json({ ok: true, version: VERSION, processed: totalProcessed, skipped: totalSkipped, errors });
});
