import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "brand-scanner-v1.0.1";

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
        SELECT submission_id, form_data, website_url
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
    let websiteUrl: string | null = formData.website_url ?? submission.website_url ?? null;
    // Normalise URL — prepend https:// if no protocol present
    if (websiteUrl && !websiteUrl.startsWith('http')) {
      websiteUrl = 'https://' + websiteUrl;
    }
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
