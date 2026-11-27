-- Per-account Grok voice for resource Listen. Default off.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS grok_voice_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_user_profile_role_and_grok_voice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.grok_voice_enabled IS DISTINCT FROM OLD.grok_voice_enabled THEN
    IF coalesce(auth.role(), '') = 'service_role'
       OR public.get_user_role(auth.uid()) = 'admin' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only an admin can change role or Grok voice access';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS user_profiles_protect_role_and_grok_voice ON public.user_profiles;
CREATE TRIGGER user_profiles_protect_role_and_grok_voice
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_profile_role_and_grok_voice();
