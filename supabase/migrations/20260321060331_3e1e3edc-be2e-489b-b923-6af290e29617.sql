
ALTER TABLE public.profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Set the existing admin user
UPDATE public.profiles SET is_admin = true WHERE email = 'maimoonaswadena@gmail.com';

-- Create a function to check admin status server-side
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;
