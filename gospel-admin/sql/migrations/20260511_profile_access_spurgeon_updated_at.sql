-- Reliable updated_at for differential backups (filter uses updated_at >= watermark).

ALTER TABLE public.profile_access
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.profile_access
SET updated_at = created_at
WHERE updated_at IS NULL;

ALTER TABLE public.profile_access
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

DROP TRIGGER IF EXISTS set_profile_access_updated_at ON public.profile_access;
CREATE TRIGGER set_profile_access_updated_at
  BEFORE UPDATE ON public.profile_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON COLUMN public.profile_access.updated_at IS 'Maintained by trigger; used for differential backups.';

ALTER TABLE public.spurgeon_passage_index
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.spurgeon_passage_index
SET updated_at = created_at
WHERE updated_at IS NULL;

ALTER TABLE public.spurgeon_passage_index
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

DROP TRIGGER IF EXISTS set_spurgeon_passage_index_updated_at ON public.spurgeon_passage_index;
CREATE TRIGGER set_spurgeon_passage_index_updated_at
  BEFORE UPDATE ON public.spurgeon_passage_index
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON COLUMN public.spurgeon_passage_index.updated_at IS 'Maintained by trigger; used for differential backups.';
