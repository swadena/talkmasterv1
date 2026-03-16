
-- Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Generate referral codes for existing profiles
UPDATE public.profiles SET referral_code = substr(md5(id::text || now()::text), 1, 8) WHERE referral_code IS NULL;

-- Make referral_code NOT NULL with default
ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN referral_code SET DEFAULT substr(md5(gen_random_uuid()::text), 1, 8);

-- Add referred_by to profiles (who referred this user)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

-- Track whether user has ever purchased (for referral reward trigger)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_purchased boolean NOT NULL DEFAULT false;

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  credits_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (referrer_id, referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can read their own referrals (as referrer)
CREATE POLICY "Users can read own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

-- System inserts referrals via trigger, but allow referred user to create the link
CREATE POLICY "Referred user can insert referral" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referred_id);

-- Update handle_new_user to generate referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits, referral_code)
  VALUES (NEW.id, NEW.email, 3, substr(md5(NEW.id::text || now()::text), 1, 8));
  RETURN NEW;
END;
$$;

-- Function to complete referral and award credits when referred user purchases
CREATE OR REPLACE FUNCTION public.complete_referral_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.has_purchased = true AND (OLD.has_purchased = false OR OLD.has_purchased IS NULL) THEN
    IF NEW.referred_by IS NOT NULL THEN
      UPDATE public.referrals
      SET status = 'completed', credits_awarded = 3, completed_at = now()
      WHERE referred_id = NEW.id AND referrer_id = NEW.referred_by AND status = 'pending';

      UPDATE public.profiles
      SET credits = credits + 3
      WHERE id = NEW.referred_by;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on profiles update for referral completion
CREATE TRIGGER on_purchase_complete_referral
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.complete_referral_on_purchase();
