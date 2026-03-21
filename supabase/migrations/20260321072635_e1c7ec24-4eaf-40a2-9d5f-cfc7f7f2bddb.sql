
-- Fix 1: Block self-referral in set_referred_by RPC
CREATE OR REPLACE FUNCTION public.set_referred_by(_referrer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _referrer_id = auth.uid() THEN RETURN; END IF;
  UPDATE public.profiles
  SET referred_by = _referrer_id
  WHERE id = auth.uid() AND referred_by IS NULL;
END;
$$;

-- Fix 2: Block self-referral in referrals INSERT policy
DROP POLICY IF EXISTS "Referred user can insert referral" ON public.referrals;
CREATE POLICY "Referred user can insert referral" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referred_id AND referrer_id != auth.uid());
