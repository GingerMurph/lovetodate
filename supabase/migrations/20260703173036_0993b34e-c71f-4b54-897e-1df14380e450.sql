
CREATE OR REPLACE FUNCTION public.claim_free_connection_atomic(_unlocker uuid, _target uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_count integer;
BEGIN
  -- Serialize concurrent calls per user with a transaction-scoped advisory lock
  PERFORM pg_advisory_xact_lock(hashtext('claim_free_connection:' || _unlocker::text));

  -- Verify mutual like still exists
  IF NOT EXISTS (SELECT 1 FROM public.likes WHERE liker_id = _unlocker AND liked_id = _target)
     OR NOT EXISTS (SELECT 1 FROM public.likes WHERE liker_id = _target AND liked_id = _unlocker) THEN
    RETURN 'no_mutual_like';
  END IF;

  -- Reject if already connected in either direction
  IF EXISTS (
    SELECT 1 FROM public.unlocked_connections
    WHERE (unlocker_id = _unlocker AND target_id = _target)
       OR (unlocker_id = _target AND target_id = _unlocker)
  ) THEN
    RETURN 'already_connected';
  END IF;

  -- Enforce single free connection per unlocker (atomic under advisory lock)
  SELECT count(*) INTO _existing_count
  FROM public.unlocked_connections
  WHERE unlocker_id = _unlocker;

  IF _existing_count > 0 THEN
    RETURN 'already_used';
  END IF;

  INSERT INTO public.unlocked_connections (unlocker_id, target_id)
  VALUES (_unlocker, _target);

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_free_connection_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_free_connection_atomic(uuid, uuid) TO service_role;
