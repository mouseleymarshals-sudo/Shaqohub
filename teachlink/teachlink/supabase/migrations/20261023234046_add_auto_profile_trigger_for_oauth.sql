/*
# Add auto profile creation trigger for OAuth users

## Overview
When a user signs up via Google OAuth, Supabase creates the auth.users row but
there is no corresponding profiles row. The client-side code tries to create
the profile after the redirect, but this can race or fail. This migration adds
a database trigger that automatically creates a profiles row when a new auth.users
row is inserted, if one doesn't already exist.

## Security
- The trigger function runs as SECURITY DEFINER (with the owner's privileges)
  because auth.users is not accessible to the authenticated role.
- The function checks if a profile already exists before inserting (idempotent).
- REVOKE EXECUTE from PUBLIC/anon so only the database can call it via the trigger.

## Notes
1. The trigger fires AFTER INSERT on auth.users.
2. It extracts the user's email, name, and avatar from the new user's metadata.
3. The role defaults to 'school_teacher' — the client can update it later via
   the role selection stored in localStorage (the AuthContext already handles this
   by updating the profile after Google redirect).
4. A welcome notification is also created automatically.
*/

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_role text;
BEGIN
  -- Skip if profile already exists (idempotent)
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Extract role from raw_user_meta_data if present, otherwise default
  pending_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.raw_app_meta_data->>'role',
    'school_teacher'
  );

  -- Validate role
  IF pending_role NOT IN ('school_teacher', 'university_lecturer', 'school', 'university') THEN
    pending_role := 'school_teacher';
  END IF;

  -- Create the profile
  INSERT INTO profiles (id, email, role, full_name, profile_picture)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    pending_role,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NULL
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    )
  );

  -- Create a welcome notification
  INSERT INTO notifications (user_id, type, title, body)
  VALUES (
    NEW.id,
    'welcome',
    'Welcome to TeachLink!',
    'Complete your profile to get the best matches and start applying to jobs.'
  );

  RETURN NEW;
END;
$$;

-- Revoke public access to the function
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO authenticated;

-- Create the trigger (drop first for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
