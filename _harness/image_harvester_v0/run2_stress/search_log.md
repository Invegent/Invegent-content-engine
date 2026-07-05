# cc-0027 mini-proof #2 — search log (run2_stress, 2026-07-05)

Sources used (GET-only, allow-listed): commons.wikimedia.org API, upload.wikimedia.org,
api.openverse.org, unsplash.com (search pages + public /download endpoint; napi JSON endpoint
was bot-blocked and NOT used), pexels.com search pages + images.pexels.com CDN.
Raw search-response JSON retained in `tmp/` as evidence.

---

## Row mm_c_perth_cbd_day_hero — verdict: harvested (3 offered, 1 best-pick)

Queries run:
- Commons API search: "Perth skyline" (40 results), "Perth cityscape Swan River" (9 results)
- Openverse: "Perth skyline city" (cc0/pdm), "Perth Swan River city" (cc0/pdm), "Elizabeth Quay Perth" (cc0/pdm)
- Unsplash search page: "perth skyline" (20 results screened)
- Pexels search page: "perth skyline" (10 results screened)

Offered (downloaded, full provenance in metadata.csv/json):
- mm_c-01 BEST PICK — Unsplash gl7nkS_h4lo, Joshua Leong — bright blue-sky day, Kings Park over CBD + Swan River, native 16:9 4000x2250.
- mm_c-02 — Unsplash Zo1eudW62Ks, Joshua Leong — cloudless blue sky across Swan River, huge sky/water negative space (warnings: foreshore road, tiny non-identifiable figures).
- mm_c-03 — Pexels 6761495, Rachel Claire — blue-sky Elizabeth Quay skyline, clean sky top ~40% (warnings: distant small people, corporate tower signage, ground-level vantage).

Near-misses (downloaded then REJECTED — all in images/ + contact sheet, disposition in metadata):
- Unsplash guguFi5GTw4 (Steve Doig): EXACT preferred South-Perth across-water hero composition, but overcast/warm late light → mood fail. Closest composition of the whole run; flagged for PK visibility, not offered as candidate because the brief's bright-day rule is explicit.
- Unsplash txoeYIPjqZs (Steve Doig): overcast + freeway clutter.
- Unsplash PjwO0TLeLT4 (George Bakos): golden-hour glow, sailboats, tiny skyline.
- Unsplash ZXgGLpUF8cg (Urlaubstracker): bright day but close-range clutter, no hero negative space.
- Unsplash 495e7G6648Y (Nathan Hurst): golden-hour aerial, flare.
- Pexels 12352539 (Daniel): blue sky but rooftop clutter, skyline mid-frame.
- Pexels 16693545 (Tibor Janas): warm low sun, carnival crowds.
- Commons CC0 "Perth City Skyline Across Lake.jpg": dusk/blue-hour.
- Commons CC0 "Perth Skyline 2012.jpg": night.

Screened, not downloaded:
- Commons CC0 "E37 Elizabeth Quay (1Feb2016)" series (Calistemon? uploader per Commons; CC0, 4000x3000): 2016 construction-era quay scenes, 4:3, quay-level — inferior to offered set; not needed within 2-4 candidate cap.
- Commons PD "Western Australia's Capital City (153646).jpg" 5188x5188 square — not screened further after cap reached.
- Unsplash Unsplash+ results (Getty) — excluded, paid tier.
- Pexels dusk/night results (12902278, 16545023, 27608818) — mood fail on listing description.

Freshness exclusions honoured (not re-offered, checked by slug/filename):
- Unsplash RESEQty1uvc / JFT5xhX1Qic / QjoJrmhkMBw — did not appear in the downloaded set; RESEQty1uvc not re-offered (already governed intake candidate).
- Wikimedia South Perth / Elizabeth Quay Bridge 2019 / Queen St Jetty / CBD Panorama / swan river foreshore / panoramio files — rediscovered in Commons results as CC BY-SA / CC BY: remain on their existing holds, not re-recorded, not offered.

Licence holds encountered for this row (hold-list, never offered):
- The bulk of high-quality Commons Perth skyline material is CC BY-SA 4.0 (e.g. "Skyline of Perth seen from South Perth, February 2023" series, Kings Park 2019 panoramas) and CC BY 2.5 AU — all held per PK Q5; most were already recorded in prior lanes, no NEW standout beyond those already on hold, so no new hold entries recorded for this row.

---

## Row mm_d_auction_crowd_au — verdict: not_harvestable_licence_safe

Queries run:
- Openverse: "house auction australia" (cc0/pdm/by), "home auction crowd" (all licences),
  "auctioneer house sold", "property auction melbourne", "auction sign real estate sold",
  "auctioneer gavel outdoor crowd", creator-scoped "auction" (avlxyz attempt)
- Commons API search: "auction house crowd australia" (0 results), "real estate auction" (30 results),
  "house auction melbourne OR sydney"
- Unsplash search page: "house auction"
- Pexels search page: "auction"

Findings — why nothing is offerable:
- Commons "real estate auction" results are historic posters/estate maps (PD) — off-brief.
- The single on-brief allowed-search hit, "File:Melbourne Real Estate Auctioneer.jpg", is
  **CC BY-SA 4.0 (hold-list)** AND 960x640 (< 2000px min) AND shows a crowd of fully
  identifiable faces including children → would be rights-rejected even if the licence were allowed.
  Recorded in licence_holds with full provenance (thumbnail-level check only, per instructions).
- Flickr via Openverse: "Clock + Dining Table - Passed-in - $2.7mil Beaconsfield" (avlxyz,
  CC BY-SA 2.0, 768x1024) — Melbourne auction event but CC BY-SA (hold), portrait, under-res.
  Recorded in licence_holds.
- Flickr lakemartinvoice 4093096908 ("Crowd awaits Scrushy Lake Martin Home auction")
  REDISCOVERED in Openverse results — freshness exclusion, previously rejected (identifiable
  faces / US scene). Not re-offered; noted as previously_evaluated.
- Unsplash "house auction": generic house exteriors / miniature-house stock; the only
  auction-relevant results are Unsplash+ (Getty) premium → excluded paid tier.
- Pexels "auction": gavels, flea/antique markets, cattle auctions (US/BD/IT), one B/W indoor
  art-auction crowd — none is an Australian residential home auction; offering them would be
  padding, so none downloaded.

Conclusion: no allowed-licence image of an Australian residential home auction with
non-identifiable people exists on the allow-listed sources as far as these queries reach.
Genuine gap — same class of outcome as the P0 row-8 precedent.
