/*
# Update application notification trigger to include rejection reasons

## Overview
Updates the `notify_application_events` trigger function so that when an application
is rejected, the notification body includes the rejection reason provided by the
employer. This lets the applicant see why they were rejected and act on it (improve
and reapply). Acceptance notifications remain unchanged.

## Changes
1. Replaces `notify_application_events()` to append the `rejection_reason` field to
   the notification body when the application status is 'rejected'.
2. Creates a Super Admin auth account and profile row for testing.
*/

CREATE OR REPLACE FUNCTION public.notify_application_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_owner uuid; v_title text; v_type text; v_body text;
BEGIN
  SELECT posted_by, title INTO v_owner, v_title FROM jobs WHERE id = NEW.job_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, type, title, body, job_id, application_id)
    VALUES (v_owner, 'new_applicant', 'New applicant',
      'A teacher submitted an application for "' || v_title || '".',
      NEW.job_id, NEW.id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_type := CASE WHEN NEW.status = 'accepted' THEN 'application_accepted' ELSE 'application_rejected' END;
    IF NEW.status = 'accepted' THEN
      v_body := 'Your application for "' || v_title || '" was selected by the employer. Our team will contact you about next steps.';
      INSERT INTO notifications (user_id, type, title, body, job_id, application_id)
      VALUES (NEW.applicant_id, v_type, 'Application selected', v_body, NEW.job_id, NEW.id);
    ELSE
      v_body := 'Your application for "' || v_title || '" was not selected.';
      IF NEW.rejection_reason IS NOT NULL AND length(trim(NEW.rejection_reason)) > 0 THEN
        v_body := v_body || ' Reason: ' || NEW.rejection_reason;
      END IF;
      v_body := v_body || ' You can improve and reapply for other positions.';
      INSERT INTO notifications (user_id, type, title, body, job_id, application_id)
      VALUES (NEW.applicant_id, v_type, 'Application update', v_body, NEW.job_id, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger already exists; drop and recreate to bind to updated function
DROP TRIGGER IF EXISTS applications_notify_events ON public.applications;
CREATE TRIGGER applications_notify_events
  AFTER INSERT OR UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_events();
REVOKE EXECUTE ON FUNCTION public.notify_application_events() FROM PUBLIC, anon, authenticated;

-- Create Super Admin account
-- Auth user
DO $$
DECLARE v_uid uuid;
BEGIN
  -- Create the auth user if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@teachlink.app') THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, instance_id)
    VALUES (
      v_uid,
      'admin@teachlink.app',
      crypt('TeachLinkAdmin2026!', gen_salt('bf')),
      now(),
      now(),
      now(),
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    );
  ELSE
    SELECT id INTO v_uid FROM auth.users WHERE email = 'admin@teachlink.app';
  END IF;

  -- Create or update the profile row as super admin
  INSERT INTO public.profiles (id, email, role, full_name, is_super_admin, phone_number)
  VALUES (v_uid, 'admin@teachlink.app', 'school', 'Super Admin', true, '+252000000000')
  ON CONFLICT (id) DO UPDATE SET
    is_super_admin = true,
    full_name = 'Super Admin';
END;
$$;

-- Send a welcome notification to the admin
INSERT INTO public.notifications (user_id, type, title, body)
SELECT id, 'welcome', 'Welcome, Super Admin', 'You have full administrative access to TeachLink.'
FROM public.profiles WHERE email = 'admin@teachlink.app' AND is_super_admin
ON CONFLICT DO NOTHING;
