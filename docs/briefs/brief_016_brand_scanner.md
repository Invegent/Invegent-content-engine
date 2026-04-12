# Claude Code Brief 016 — brand-scanner Edge Function

**Date:** 12 April 2026  
**Status:** READY TO RUN  
**Decisions:** D087  
**Repo:** `Invegent-content-engine`  
**Working directory:** `C:\Users\parve\Invegent-content-engine`  
**Supabase project:** `mbkmaxqhsohbtwsqolns`  
**MCPs required:** Supabase MCP, GitHub MCP  
**Estimated time:** 3–4 hours  

---

## Architecture decision

brand-scanner runs BEFORE approval (triggered by Run Scans button).
At that point no `client_id` exists yet — only a `submission_id`.

**Solution:** Store brand scan results back into the submission JSONB
as a `brand_scan_result` key. On approval, `approve_onboarding()`
copies the brand data to `c.client_brand_profile`.

This means:
- No FK constraint issues (no client_id needed)
- Checklist can read results immediately from submission
- Single source of truth during pre-approval
- approve_onboarding handles the final write to brand profile

---

## Task 1 — Create Supabase Storage bucket

Check if bucket `client-assets` exists. If not, create it.

```sql
-- Check existing buckets
SELECT id, name, public FROM storage.buckets WHERE name = 'client-assets';
```

If not found, create via Supabase MCP apply_migration:
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-assets',
  'client-assets',
  false,
  5242880,  -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif', 'image/x-icon']
)
ON CONFLICT (id) DO NOTHING;
```

Add storage policy so service role can read/write:
```sql
CREATE POLICY "service_role_full_access" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'client-assets');
```

If policy already exists, skip.

---

## Task 2 — SECURITY DEFINER function: update_submission_brand_scan

This updates the submission JSONB with brand scan results.
Needed because exec_sql silently fails for DML on c schema.

```sql
CREATE OR REPLACE FUNCTION public.update_submission_brand_scan(
  p_submission_id UUID,
  p_brand_scan_result JSONB
)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE c.onboarding_submission
  SET
    form_data = form_data || jsonb_build_object('brand_scan_result', p_brand_scan_result),
    updated_at = NOW()
  WHERE submission_id = p_submission_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.update_submission_brand_scan(UUID, JSONB) TO service_role;
```

Verification:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'update_submission_brand_scan';
```

---

## Task 3 — Update approve_onboarding to copy brand data

Update the existing `public.approve_onboarding` function to copy
brand scan results to `c.client_brand_profile` if they exist.

First READ the current function body:
```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'approve_onboarding' AND pronamespace = 'public'::regnamespace;
```

Then add this block AFTER the client is created (after the INSERT into c.client),
still inside the same transaction:

```sql
-- Copy brand scan result to c.client_brand_profile if it exists
INSERT INTO c.client_brand_profile (
  client_id,
  brand_logo_url,
  logo_storage_path,
  logo_extraction_method,
  brand_colour_primary,
  brand_colour_secondary,
  accent_hex,
  extraction_confidence,
  website_scraped_at,
  updated_by,
  last_updated_at
)
SELECT
  v_client_id,
  (sub.form_data->'brand_scan_result'->>'logo_url'),
  (sub.form_data->'brand_scan_result'->>'logo_storage_path'),
  (sub.form_data->'brand_scan_result'->>'extraction_method'),
  (sub.form_data->'brand_scan_result'->>'primary_hex'),
  (sub.form_data->'brand_scan_result'->>'secondary_hex'),
  (sub.form_data->'brand_scan_result'->>'accent_hex'),
  (sub.form_data->'brand_scan_result'->>'confidence')::numeric,
  NOW(),
  'brand-scanner',
  NOW()
FROM c.onboarding_submission sub
WHERE sub.submission_id = p_submission_id
  AND sub.form_data->'brand_scan_result' IS NOT NULL
ON CONFLICT (client_id) DO UPDATE SET
  brand_logo_url = EXCLUDED.brand_logo_url,
  logo_storage_path = EXCLUDED.logo_storage_path,
  logo_extraction_method = EXCLUDED.logo_extraction_method,
  brand_colour_primary = EXCLUDED.brand_colour_primary,
  brand_colour_secondary = EXCLUDED.brand_colour_secondary,
  accent_hex = EXCLUDED.accent_hex,
  extraction_confidence = EXCLUDED.extraction_confidence,
  website_scraped_at = EXCLUDED.website_scraped_at,
  updated_by = EXCLUDED.updated_by,
  last_updated_at = EXCLUDED.last_updated_at;
```

IMPORTANT: The variable name for client_id inside approve_onboarding may differ.
Read the function body first and use the correct variable name.
If the function does not have a transaction block, add the INSERT inside
the existing BEGIN...END block.

---

## Task 4 — Create brand-scanner Edge Function

**File:** `supabase/functions/brand-scanner/index.ts`

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "brand-scanner-v1.0.0";

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Extract dominant colour from raw HTML using meta tags
function extractThemeColour(html: string): string | null {
  // Try theme-color meta tag
  const themeMatch = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([#\w]+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([#\w]+)["'][^>]+name=["']theme-color["']/i);
  if (themeMatch?.[1] && themeMatch[1].startsWith('#')) return themeMatch[1];

  // Try msapplication-TileColor
  const tileMatch = html.match(/<meta[^>]+name=["']msapplication-TileColor["'][^>]+content=["']([#\w]+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([#\w]+)["'][^>]+name=["']msapplication-TileColor["']/i);
  if (tileMatch?.[1] && tileMatch[1].startsWith('#')) return tileMatch[1];

  return null;
}

// Extract OG image URL from raw HTML
function extractOgImage(html: string): string | null {
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return match?.[1] ?? null;
}

// Extract favicon URL from raw HTML
function extractFavicon(html: string, baseUrl: string): string | null {
  // apple-touch-icon first (higher quality)
  const appleMatch = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i);
  if (appleMatch?.[1]) return resolveUrl(appleMatch[1], baseUrl);

  // Standard favicon
  const iconMatch = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i);
  if (iconMatch?.[1]) return resolveUrl(iconMatch[1], baseUrl);

  // Default favicon path
  return `${new URL(baseUrl).origin}/favicon.ico`;
}

function resolveUrl(href: string, base: string): string {
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return 'https:' + href;
  if (href.startsWith('/')) return new URL(base).origin + href;
  return new URL(href, base).href;
}

// Derive a secondary colour (lightened version of primary)
function deriveSecondary(hex: string): string | null {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Lighten by 40%
    const lr = Math.min(255, Math.round(r + (255 - r) * 0.4));
    const lg = Math.min(255, Math.round(g + (255 - g) * 0.4));
    const lb = Math.min(255, Math.round(b + (255 - b) * 0.4));
    return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
    'image/svg+xml': 'svg', 'image/webp': 'webp',
    'image/x-icon': 'ico', 'image/gif': 'gif',
  };
  return map[mimeType] ?? 'png';
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405 });
  }

  let submission_id: string;
  try {
    const body = await req.json();
    submission_id = body.submission_id;
    if (!submission_id) throw new Error('submission_id required');
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 400 });
  }

  const supabase = getServiceClient();
  const log: string[] = [];

  try {
    // Load submission
    const { data: rows } = await supabase.rpc('exec_sql', {
      query: `
        SELECT submission_id, form_data
        FROM c.onboarding_submission
        WHERE submission_id = '${submission_id}'::uuid
        LIMIT 1
      `,
    });

    if (!rows?.[0]) {
      return new Response(JSON.stringify({ ok: false, error: 'Submission not found' }), { status: 404 });
    }

    const submission = rows[0];
    const formData = submission.form_data ?? {};
    const websiteUrl: string | null = formData.website_url ?? null;
    const logoDataUrl: string | null = formData.logo_data_url ?? null;
    const logoFileName: string | null = formData.logo_file_name ?? null;

    let logoUrl: string | null = null;
    let logoStoragePath: string | null = null;
    let primaryHex: string | null = null;
    let secondaryHex: string | null = null;
    let accentHex: string | null = null;
    let extractionMethod: string = 'none';
    let confidence: number = 0.0;

    // --- LOGO EXTRACTION ---

    // Priority 1: Client uploaded a logo in the form
    if (logoDataUrl && logoDataUrl.startsWith('data:')) {
      log.push('Logo source: uploaded base64');
      try {
        const commaIdx = logoDataUrl.indexOf(',');
        const mimeMatch = logoDataUrl.match(/data:([^;]+);/);
        const mimeType = mimeMatch?.[1] ?? 'image/png';
        const ext = getFileExtension(mimeType);
        const base64Data = logoDataUrl.slice(commaIdx + 1);
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        const storagePath = `submissions/${submission_id}/logo.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('client-assets')
          .upload(storagePath, bytes, { contentType: mimeType, upsert: true });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('client-assets').getPublicUrl(storagePath);
          logoUrl = urlData?.publicUrl ?? null;
          logoStoragePath = storagePath;
          extractionMethod = 'uploaded';
          confidence = 1.0;
          log.push(`Logo uploaded to storage: ${storagePath}`);
        } else {
          log.push(`Storage upload failed: ${uploadErr.message}`);
        }
      } catch (e: any) {
        log.push(`Logo decode/upload error: ${e.message}`);
      }
    }

    // Priority 2: Scrape website for og:image and theme-color
    if (websiteUrl && (logoUrl === null || primaryHex === null)) {
      log.push(`Fetching website: ${websiteUrl}`);
      try {
        const siteRes = await fetch(websiteUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Invegent-BrandScanner/1.0)' },
          signal: AbortSignal.timeout(8000),
        });
        const html = await siteRes.text();

        // Extract theme colour
        if (primaryHex === null) {
          primaryHex = extractThemeColour(html);
          if (primaryHex) {
            log.push(`Theme colour extracted: ${primaryHex}`);
            confidence = Math.max(confidence, 0.8);
          }
        }

        // Extract logo from og:image (only if no uploaded logo)
        if (logoUrl === null) {
          const ogImage = extractOgImage(html);
          if (ogImage) {
            log.push(`OG image found: ${ogImage}`);
            try {
              const imgRes = await fetch(ogImage, { signal: AbortSignal.timeout(8000) });
              const contentType = imgRes.headers.get('content-type') ?? 'image/png';
              const ext = getFileExtension(contentType.split(';')[0].trim());
              const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
              const storagePath = `submissions/${submission_id}/logo.${ext}`;

              const { error: uploadErr } = await supabase.storage
                .from('client-assets')
                .upload(storagePath, imgBytes, { contentType, upsert: true });

              if (!uploadErr) {
                const { data: urlData } = supabase.storage.from('client-assets').getPublicUrl(storagePath);
                logoUrl = urlData?.publicUrl ?? null;
                logoStoragePath = storagePath;
                extractionMethod = 'scraped';
                confidence = Math.max(confidence, 0.7);
                log.push(`OG image uploaded to storage: ${storagePath}`);
              }
            } catch (e: any) {
              log.push(`OG image download error: ${e.message}`);
            }
          }

          // Fallback: favicon URL (don't download, just reference)
          if (logoUrl === null) {
            const faviconUrl = extractFavicon(html, websiteUrl);
            if (faviconUrl) {
              logoUrl = faviconUrl;
              extractionMethod = 'favicon';
              confidence = Math.max(confidence, 0.4);
              log.push(`Using favicon as logo fallback: ${faviconUrl}`);
            }
          }
        }
      } catch (e: any) {
        log.push(`Website fetch error: ${e.message}`);
      }
    }

    // Derive secondary and accent from primary
    if (primaryHex) {
      secondaryHex = deriveSecondary(primaryHex);
      // Accent: darker version
      try {
        const r = parseInt(primaryHex.slice(1, 3), 16);
        const g = parseInt(primaryHex.slice(3, 5), 16);
        const b = parseInt(primaryHex.slice(5, 7), 16);
        const dr = Math.max(0, Math.round(r * 0.7));
        const dg = Math.max(0, Math.round(g * 0.7));
        const db = Math.max(0, Math.round(b * 0.7));
        accentHex = `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
      } catch { /* ignore */ }
    }

    // Build result
    const brandScanResult = {
      logo_url: logoUrl,
      logo_storage_path: logoStoragePath,
      extraction_method: extractionMethod,
      primary_hex: primaryHex,
      secondary_hex: secondaryHex,
      accent_hex: accentHex,
      confidence: confidence.toFixed(2),
      scanned_at: new Date().toISOString(),
      log,
    };

    // Write back to submission
    const { data: updateResult } = await supabase.rpc('update_submission_brand_scan', {
      p_submission_id: submission_id,
      p_brand_scan_result: brandScanResult,
    });

    log.push(`Submission updated: ${updateResult}`);

    return new Response(
      JSON.stringify({ ok: true, version: VERSION, brand_scan_result: brandScanResult, log }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (e: any) {
    console.error(`[brand-scanner] error:`, e);
    return new Response(
      JSON.stringify({ ok: false, error: e.message, log }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Task 5 — Push to GitHub and deploy

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/brand-scanner/
git commit -m "feat: brand-scanner Edge Function v1.0.0 (D087)"
git push origin main
```

Then deploy:
```bash
npx supabase functions deploy brand-scanner --project-ref mbkmaxqhsohbtwsqolns
```

If the CLI deploy times out (known issue), PK will deploy manually via:
Supabase dashboard → Edge Functions → brand-scanner → Deploy

---

## Task 6 — Wire up the run-scans API route

**File:** `app/api/onboarding/run-scans/route.ts` in `invegent-dashboard`

Replace the stub response with actual Edge Function invocation.
Uncomment the brand-scanner call and update to the real pattern:

```typescript
// Invoke brand-scanner (fire and forget)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

try {
  const scanRes = await fetch(`${supabaseUrl}/functions/v1/brand-scanner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ submission_id }),
  });
  const scanData = await scanRes.json();
  console.log('[run-scans] brand-scanner result:', scanData);
} catch (e) {
  console.error('[run-scans] brand-scanner error:', e);
  // Non-fatal: log and continue
}

return NextResponse.json({
  ok: true,
  message: 'Brand scan complete. AI profile bootstrap will be available in the next build session.',
  submission_id,
});
```

After updating, rebuild and deploy invegent-dashboard:
```bash
cd C:\Users\parve\invegent-dashboard
git add app/api/onboarding/run-scans/route.ts
git commit -m "feat: wire run-scans to brand-scanner Edge Function"
git push origin main
```

---

## Task 7 — Update dashboard checklist to show brand scan results

**File:** `app/(dashboard)/onboarding/page.tsx` in `invegent-dashboard`

Update `ReadinessChecklist` items 6 and 7 (brand scan + AI profile) to read
from `detail.brand_scan_result` (which is inside `detail.form_data` in the
submission JSONB).

At the top of the component, derive:
```tsx
const brandScan = detail.form_data?.brand_scan_result ?? detail.brand_scan_result ?? null;
const hasBrandLogo = !!(brandScan?.logo_url);
const hasBrandColour = !!(brandScan?.primary_hex);
```

Update checklist item for brand scan:
```tsx
{
  label: hasBrandLogo
    ? `Logo found ✓ ${brandScan?.primary_hex ? `· Colour: ${brandScan.primary_hex}` : ''}`
    : scanStatus === 'done' ? 'Brand scan complete — no logo found (manual entry needed)' : 'Brand scan not run',
  pass: hasBrandLogo,
  pending: scanStatus === 'running',
  warn: scanStatus === 'done' && !hasBrandLogo,
},
```

---

## Task 8 — Write result file

Write `docs/briefs/brief_016_result.md` in Invegent-content-engine:
- Tasks 1–7: COMPLETED / FAILED / SKIPPED
- Storage bucket: created or already existed
- Functions created in Supabase: update_submission_brand_scan
- Edge Function: deployed or needs manual deploy
- Dashboard wired: yes/no
- Notes on any failures

---

## Error handling rules

- If `c.client_brand_profile` does not have a UNIQUE constraint on client_id,
  the ON CONFLICT in approve_onboarding will fail. Check first:
  ```sql
  SELECT constraint_name FROM information_schema.table_constraints
  WHERE table_schema = 'c' AND table_name = 'client_brand_profile'
    AND constraint_type = 'UNIQUE';
  ```
  Add if missing: `ALTER TABLE c.client_brand_profile ADD CONSTRAINT client_brand_profile_client_id_unique UNIQUE (client_id);`

- If `c.onboarding_submission` does not have a `form_data` JSONB column,
  check the actual column name for the submission JSONB (may be `submission_data` or similar).
  Use that column name in update_submission_brand_scan.

- If the supabase CLI deploy times out: git push is enough. Write to result file
  that manual deploy is needed.

- Do not fail the function if colour extraction returns null —
  a successful logo extraction with no colour is still useful.

- If website fetch fails (timeout, blocked): log it and continue.
  A submission with only an uploaded logo is still a valid result.

---

## What this brief does NOT include

- AI profile bootstrap Edge Function (Brief 017)
- Portal CSS custom properties reading from client_brand_profile (Brief 018)
- pg_cron trigger for brand-scanner (it is triggered manually via Run Scans)
- Colour extraction from image pixels (too complex for Deno without WASM — using meta tags instead)
