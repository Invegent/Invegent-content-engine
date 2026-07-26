-- Asset Gap lane · Batch-2 B2-2/B2-4 · Invegent + CFW brand-colour data fill
-- Target: c.client_brand_profile.brand_colour_primary / brand_colour_secondary
-- Read by: image-worker getBrandAndSlug() (index.ts:894-896); NULL -> default #0A2A4A/#1C8A8A
-- Values: governed logo-kit palettes (invegent_logo_intake_v0 / care_for_welfare_logo_intake_v0)
-- Baseline verified 2026-07-26: all four fields NULL (live mbkmaxqhsohbtwsqolns).
-- Guard: fail-closed CAS -- only fills rows still NULL (0 rows if a concurrent lane already set them).

BEGIN;

-- Invegent (93494a09-cc89-41d1-b364-cb63983063a6): navy bg + cyan accent (kit role labels)
UPDATE c.client_brand_profile
   SET brand_colour_primary   = '#1B3A5C',
       brand_colour_secondary = '#05ADDA',
       updated_at             = now()
 WHERE client_id = '93494a09-cc89-41d1-b364-cb63983063a6'
   AND brand_colour_primary IS NULL
   AND brand_colour_secondary IS NULL;

-- Care For Welfare (3eca32aa-e460-462f-a846-3f6ace6a3cae): soft charcoal bg + cyan leaf accent
UPDATE c.client_brand_profile
   SET brand_colour_primary   = '#233141',
       brand_colour_secondary = '#00BCE4',
       updated_at             = now()
 WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'
   AND brand_colour_primary IS NULL
   AND brand_colour_secondary IS NULL;

-- Post-apply assertion: exactly 2 target rows now carry the intended values; fail-closed otherwise.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM c.client_brand_profile
   WHERE (client_id = '93494a09-cc89-41d1-b364-cb63983063a6'
          AND brand_colour_primary = '#1B3A5C' AND brand_colour_secondary = '#05ADDA')
      OR (client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'
          AND brand_colour_primary = '#233141' AND brand_colour_secondary = '#00BCE4');
  IF n <> 2 THEN
    RAISE EXCEPTION 'brand-colour fill assertion failed: expected 2 target rows, found %', n;
  END IF;
END $$;

COMMIT;
