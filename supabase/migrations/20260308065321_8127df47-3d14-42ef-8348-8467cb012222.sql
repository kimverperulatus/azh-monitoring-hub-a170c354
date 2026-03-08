-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

-- Create a SECURITY DEFINER function to check admin role without hitting RLS
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'
  )
$$;

-- Re-create admin read policy using the function (avoids recursion)
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Fix the permissions policy too (also references profiles directly)
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.role_permissions;

CREATE POLICY "Admins can manage permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));