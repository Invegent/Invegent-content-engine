-- Stage 3.020 — Two-trigger chain: classifier output → vertical_map → signal_pool
--
-- Trigger 1: f.canonical_content_body AFTER UPDATE OF content_class (and AFTER INSERT)
--            Resolves verticals and inserts canonical_vertical_map rows.
-- Trigger 2: f.canonical_vertical_map AFTER INSERT
--            Calls m.refresh_signal_pool_for_pair() per row.

-- =========================================================================
-- Trigger 1: classifier output handler
-- =========================================================================

CREATE OR REPLACE FUNCTION f.handle_classifier_output()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_class text;
  v_new_class text;
BEGIN
  v_new_class := NEW.content_class;

  -- Only act when content_class is now non-null
  IF v_new_class IS NULL THEN
    RETURN NEW;
  END IF;

  -- For UPDATE, compare old vs new class. For INSERT, OLD is unset.
  IF TG_OP = 'UPDATE' THEN
    v_old_class := OLD.content_class;
    -- No-op if the class hasn't actually changed
    IF v_old_class IS NOT DISTINCT FROM v_new_class THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Insert one canonical_vertical_map row per resolved vertical.
  -- ON CONFLICT DO NOTHING handles the case where this canonical already has
  -- a mapping for some vertical (e.g. classifier reclassified to same class
  -- but trigger fired twice, or a manual mapping pre-existed).
  INSERT INTO f.canonical_vertical_map (canonical_id, vertical_id, mapping_source)
  SELECT NEW.canonical_id, vertical_id, 'classifier_auto'
  FROM m.resolve_canonical_verticals(NEW.canonical_id)
  ON CONFLICT (canonical_id, vertical_id) DO NOTHING;

  -- Note: if the class CHANGED on an existing canonical with already-mapped verticals,
  -- the canonical_vertical_map rows stay (they only encode "this canonical is relevant
  -- to vertical X" — which doesn't depend on class). But Trigger 2 won't fire on the
  -- ON CONFLICT no-ops, so the pool entries won't refresh from this path.
  -- Solution: explicitly call refresh_signal_pool_for_pair for existing mappings too.
  -- This handles the reclassification case correctly.
  IF TG_OP = 'UPDATE' AND v_old_class IS DISTINCT FROM v_new_class THEN
    PERFORM m.refresh_signal_pool_for_pair(NEW.canonical_id, vertical_id)
    FROM f.canonical_vertical_map
    WHERE canonical_id = NEW.canonical_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION f.handle_classifier_output() IS
  'Trigger function: when content_class is set/changed on f.canonical_content_body, resolve verticals and populate f.canonical_vertical_map. On reclassification, also refresh existing pool entries. Stage 3.020.';

-- AFTER UPDATE OF content_class — fires when classifier UPDATEs an existing body row.
-- AFTER INSERT — fires for the rare case a body row is inserted with content_class
-- already set (defensive; current pipeline does INSERT NULL + UPDATE).
DROP TRIGGER IF EXISTS trg_handle_classifier_output ON f.canonical_content_body;

CREATE TRIGGER trg_handle_classifier_output
AFTER UPDATE OF content_class OR INSERT ON f.canonical_content_body
FOR EACH ROW
EXECUTE FUNCTION f.handle_classifier_output();

-- =========================================================================
-- Trigger 2: vertical_map → signal_pool refresh
-- =========================================================================

CREATE OR REPLACE FUNCTION f.handle_canonical_vertical_map_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM m.refresh_signal_pool_for_pair(NEW.canonical_id, NEW.vertical_id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION f.handle_canonical_vertical_map_insert() IS
  'Trigger function: on f.canonical_vertical_map INSERT, refresh the corresponding m.signal_pool entry. Stage 3.020.';

DROP TRIGGER IF EXISTS trg_canonical_vertical_map_pool_refresh ON f.canonical_vertical_map;

CREATE TRIGGER trg_canonical_vertical_map_pool_refresh
AFTER INSERT ON f.canonical_vertical_map
FOR EACH ROW
EXECUTE FUNCTION f.handle_canonical_vertical_map_insert();
