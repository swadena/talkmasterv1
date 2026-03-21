
-- Create a secure function to deduct a credit
CREATE OR REPLACE FUNCTION public.deduct_credit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits integer;
BEGIN
  SELECT credits INTO current_credits
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF current_credits IS NULL OR current_credits <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET credits = credits - 1
  WHERE id = auth.uid();

  RETURN true;
END;
$$;

-- Create a secure function to set referred_by
CREATE OR REPLACE FUNCTION public.set_referred_by(_referrer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET referred_by = _referrer_id
  WHERE id = auth.uid()
    AND referred_by IS NULL;
END;
$$;
