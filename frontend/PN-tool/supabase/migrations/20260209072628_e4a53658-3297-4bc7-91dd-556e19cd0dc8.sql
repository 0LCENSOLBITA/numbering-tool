-- Fix overly permissive UPDATE policy on projects
-- Users can only update projects they created, admins can update all
DROP POLICY "Authenticated users can update projects" ON public.projects;

CREATE POLICY "Users can update their own projects or admins can update all"
ON public.projects FOR UPDATE
TO authenticated
USING (auth.uid() = created_by OR public.is_admin(auth.uid()));