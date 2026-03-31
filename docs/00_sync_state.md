# Sync State — Edge Functions & Known Issues

Last updated: 2026-03-31

## Deployed Edge Function Versions

| Function      | Deployed Version | GitHub Commit | Notes |
|---------------|-----------------|---------------|-------|
| ai-worker     | v2.6.1          | 6b0182b       | Format advisor seed fix, YouTube Stage A, content-intelligence profiles |
| image-worker  | v3.9.1          | c664406       | Carousel image_url fix (Fix 3), client_id resolution (Fix 1), video fallback (Fix 2) |

## Known Issues

### Resolved (2026-03-31)

- **Carousel image_url = null** — image-worker carousel path was setting `image_status = 'generated'` without writing `image_url` to `m.post_draft`. Fixed in image-worker v3.9.1: tracks `firstSlideUrl` across slides and writes it before updating status. 5 existing carousel drafts backfilled via SQL.

- **ai-worker source stale on GitHub** — local stub was v2.2.0 while deployed was v2.6.1. Pulled live source via `supabase functions download` and committed.

### Confirmed Working (2026-03-31)

- **D055 trg_remap_video_format trigger** — BEFORE INSERT/UPDATE trigger on `m.post_draft` remaps `video_short_kinetic`, `video_short_stat`, `video_short_voice` to `image_quote`. Trigger exists and is active. No video-format drafts have been produced since deployment, so no `original_format` rows yet — expected, will populate on next pipeline run.

### Open

- (none at this time)
