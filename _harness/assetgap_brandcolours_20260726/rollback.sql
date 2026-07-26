-- Rollback for Invegent + CFW brand-colour data fill.
-- Baseline was NULL/NULL for both rows (verified live 2026-07-26). This restores that exact baseline.
-- Scoped to the two values THIS lane wrote, so it will not clobber a later deliberate change
-- that replaced them with different colours.

BEGIN;

UPDATE c.client_brand_profile
   SET brand_colour_primary   = NULL,
       brand_colour_secondary = NULL,
       updated_at             = now()
 WHERE client_id = '93494a09-cc89-41d1-b364-cb63983063a6'
   AND brand_colour_primary = '#1B3A5C'
   AND brand_colour_secondary = '#05ADDA';

UPDATE c.client_brand_profile
   SET brand_colour_primary   = NULL,
       brand_colour_secondary = NULL,
       updated_at             = now()
 WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'
   AND brand_colour_primary = '#233141'
   AND brand_colour_secondary = '#00BCE4';

COMMIT;
