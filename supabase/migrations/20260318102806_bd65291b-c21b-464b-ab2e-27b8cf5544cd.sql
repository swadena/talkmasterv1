
-- Update handle_new_user to grant 10 bonus credits for first 300 users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_count integer;
  bonus_credits integer := 0;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;
  IF user_count < 300 THEN
    bonus_credits := 10;
  END IF;
  INSERT INTO public.profiles (id, email, credits, referral_code, credits_expire_at)
  VALUES (NEW.id, NEW.email, 3 + bonus_credits, substr(md5(NEW.id::text || now()::text), 1, 8), now() + interval '7 days');
  RETURN NEW;
END;
$$;
