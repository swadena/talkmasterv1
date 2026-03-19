ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS feedback_reward_claimed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS feedback_skipped_once boolean NOT NULL DEFAULT false;