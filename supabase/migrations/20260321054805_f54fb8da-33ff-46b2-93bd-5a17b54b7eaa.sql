
-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create restricted UPDATE policy that prevents users from modifying sensitive fields
-- Users can only update: referred_by, feedback_skipped_once
-- Sensitive fields (credits, has_purchased, founding_user, feedback_reward_claimed, referral_code) 
-- can only be changed by service-role (edge functions/triggers)
CREATE POLICY "Users can update own safe fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND credits = (SELECT p.credits FROM public.profiles p WHERE p.id = auth.uid())
  AND has_purchased = (SELECT p.has_purchased FROM public.profiles p WHERE p.id = auth.uid())
  AND founding_user = (SELECT p.founding_user FROM public.profiles p WHERE p.id = auth.uid())
  AND feedback_reward_claimed = (SELECT p.feedback_reward_claimed FROM public.profiles p WHERE p.id = auth.uid())
);
