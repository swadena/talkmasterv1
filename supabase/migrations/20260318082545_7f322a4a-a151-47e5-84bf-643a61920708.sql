ALTER TABLE public.profiles ADD COLUMN credits_expire_at timestamp with time zone DEFAULT (now() + interval '7 days');

UPDATE public.profiles SET credits_expire_at = now() + interval '7 days' WHERE credits_expire_at IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits, referral_code, credits_expire_at)
  VALUES (NEW.id, NEW.email, 3, substr(md5(NEW.id::text || now()::text), 1, 8), now() + interval '7 days');
  RETURN NEW;
END;
$$;