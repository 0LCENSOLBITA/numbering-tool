-- Fix: Change restrictive policies to permissive so either one can grant access
DROP POLICY "Admins can update any profile" ON public.profiles;
DROP POLICY "Users can update their own profile" ON public.profiles;

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);