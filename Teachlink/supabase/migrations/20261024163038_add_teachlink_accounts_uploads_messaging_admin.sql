/*
# Add secure TeachLink uploads, applications, messaging, support, and administration

## Overview
This migration adds the durable data and storage controls required for real account
operations. Profile photos are public because they appear with institution job adverts.
Resumes, chat attachments, and support attachments remain private and are only visible
to the relevant authenticated participants.

## New tables
- `subscription_requests`: Dahabshil payment references awaiting verification.
- `conversations`: one private conversation per job application between applicant and institution.
- `messages`: private conversation messages with optional private file attachments.
- `support_threads`: account support conversations, including suspension and subscription help.
- `support_messages`: messages inside support threads with optional private attachments.

## Modified tables
- `profiles`: adds account suspension state, super-admin flag, and suspension reason.
- `applications`: adds resume metadata and optional cover note.

## Security
- Enables RLS on every new table.
- Grants only authenticated users the operations used by the app.
- Restricts conversation and message access to participants.
- Restricts support access to the requester and super administrators.
- Restricts suspension, administrator flags, and subscription activation to a protected function.
- Adds private storage buckets and owner/participant storage policies.
- Adds automatic notifications for new applicants and application decisions.
- Limits profile photos to 5 MB, resumes to 5 MB, and message/support attachments to 4 MB.

## Important notes
1. Subscription requests do not activate accounts automatically; an administrator must verify the Dahabshil payment.
2. The super-admin dashboard is available only to profiles whose protected `is_super_admin` flag is true.
3. Storage paths must begin with the authenticated user's ID.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS resume_path text,
  ADD COLUMN IF NOT EXISTS resume_name text,
  ADD COLUMN IF NOT EXISTS resume_size integer,
  ADD COLUMN IF NOT EXISTS cover_note text;

CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('basic', 'premium', 'enterprise')),
  payment_reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  participant_one uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_two uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_distinct_participants CHECK (participant_one <> participant_two)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  attachment_path text,
  attachment_name text,
  attachment_size integer,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_or_attachment CHECK (length(trim(body)) > 0 OR attachment_path IS NOT NULL),
  CONSTRAINT messages_attachment_size CHECK (attachment_size IS NULL OR attachment_size <= 4194304)
);

CREATE TABLE IF NOT EXISTS public.support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  attachment_path text,
  attachment_name text,
  attachment_size integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_body_or_attachment CHECK (length(trim(body)) > 0 OR attachment_path IS NOT NULL),
  CONSTRAINT support_messages_attachment_size CHECK (attachment_size IS NULL OR attachment_size <= 4194304)
);

CREATE INDEX IF NOT EXISTS subscription_requests_user_idx ON public.subscription_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_participants_idx ON public.conversations(participant_one, participant_two);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS support_threads_requester_idx ON public.support_threads(requester_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_messages_thread_idx ON public.support_messages(thread_id, created_at);

ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.subscription_requests TO authenticated;
GRANT SELECT, INSERT ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_threads TO authenticated;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;

DROP POLICY IF EXISTS "subscription_requests_select_own_or_admin" ON public.subscription_requests;
CREATE POLICY "subscription_requests_select_own_or_admin" ON public.subscription_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin));
DROP POLICY IF EXISTS "subscription_requests_insert_own" ON public.subscription_requests;
CREATE POLICY "subscription_requests_insert_own" ON public.subscription_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
CREATE POLICY "conversations_select_participant" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = participant_one OR auth.uid() = participant_two);
DROP POLICY IF EXISTS "conversations_insert_participant" ON public.conversations;
CREATE POLICY "conversations_insert_participant" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
CREATE POLICY "messages_select_participant" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())));
DROP POLICY IF EXISTS "messages_insert_sender_participant" ON public.messages;
CREATE POLICY "messages_insert_sender_participant" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())));
DROP POLICY IF EXISTS "messages_update_recipient_read" ON public.messages;
CREATE POLICY "messages_update_recipient_read" ON public.messages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())));

DROP POLICY IF EXISTS "support_threads_select_requester_or_admin" ON public.support_threads;
CREATE POLICY "support_threads_select_requester_or_admin" ON public.support_threads FOR SELECT TO authenticated USING (requester_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin));
DROP POLICY IF EXISTS "support_threads_insert_own" ON public.support_threads;
CREATE POLICY "support_threads_insert_own" ON public.support_threads FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
DROP POLICY IF EXISTS "support_threads_update_requester_or_admin" ON public.support_threads;
CREATE POLICY "support_threads_update_requester_or_admin" ON public.support_threads FOR UPDATE TO authenticated USING (requester_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin)) WITH CHECK (requester_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin));

DROP POLICY IF EXISTS "support_messages_select_participant_or_admin" ON public.support_messages;
CREATE POLICY "support_messages_select_participant_or_admin" ON public.support_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.support_threads t WHERE t.id = thread_id AND (t.requester_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin))));
DROP POLICY IF EXISTS "support_messages_insert_participant_or_admin" ON public.support_messages;
CREATE POLICY "support_messages_insert_participant_or_admin" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.support_threads t WHERE t.id = thread_id AND (t.requester_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin))));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-avatars', 'profile-avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('resumes', 'resumes', false, 5242880, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('message-attachments', 'message-attachments', false, 4194304, ARRAY['image/jpeg','image/png','image/webp','application/pdf','text/plain']),
  ('support-attachments', 'support-attachments', false, 4194304, ARRAY['image/jpeg','image/png','image/webp','application/pdf','text/plain'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "profile_avatar_insert_own" ON storage.objects;
CREATE POLICY "profile_avatar_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "profile_avatar_update_own" ON storage.objects;
CREATE POLICY "profile_avatar_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "profile_avatar_delete_own" ON storage.objects;
CREATE POLICY "profile_avatar_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "resume_insert_own" ON storage.objects;
CREATE POLICY "resume_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "resume_select_own_or_job_owner" ON storage.objects;
CREATE POLICY "resume_select_own_or_job_owner" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resumes' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id WHERE a.resume_path = name AND j.posted_by = auth.uid())));
DROP POLICY IF EXISTS "resume_update_own" ON storage.objects;
CREATE POLICY "resume_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "resume_delete_own" ON storage.objects;
CREATE POLICY "resume_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "message_attachment_insert_own" ON storage.objects;
CREATE POLICY "message_attachment_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "message_attachment_select_participant" ON storage.objects;
CREATE POLICY "message_attachment_select_participant" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'message-attachments' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id WHERE m.attachment_path = name AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid()))));

DROP POLICY IF EXISTS "support_attachment_insert_own" ON storage.objects;
CREATE POLICY "support_attachment_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "support_attachment_select_participant" ON storage.objects;
CREATE POLICY "support_attachment_select_participant" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'support-attachments' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.support_messages sm JOIN public.support_threads st ON st.id = sm.thread_id WHERE sm.attachment_path = name AND (st.requester_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin)))));

CREATE OR REPLACE FUNCTION public.create_conversation_for_application(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_applicant uuid; v_owner uuid; v_job uuid;
BEGIN
  SELECT a.applicant_id, j.posted_by, a.job_id INTO v_applicant, v_owner, v_job FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = p_application_id;
  IF auth.uid() IS NULL OR (auth.uid() <> v_applicant AND auth.uid() <> v_owner) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO conversations (job_id, application_id, participant_one, participant_two) VALUES (v_job, p_application_id, v_applicant, v_owner) ON CONFLICT (application_id) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN SELECT id INTO v_id FROM conversations WHERE application_id = p_application_id; END IF;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_conversation_for_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_conversation_for_application(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_account_status(p_user_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_status NOT IN ('active','suspended') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE profiles SET account_status = p_status, suspension_reason = CASE WHEN p_status = 'suspended' THEN p_reason ELSE NULL END, suspended_at = CASE WHEN p_status = 'suspended' THEN now() ELSE NULL END WHERE id = p_user_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_account_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_account_status(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_subscription_request(p_request_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user uuid; v_plan text; v_end date;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT user_id, plan INTO v_user, v_plan FROM subscription_requests WHERE id = p_request_id;
  UPDATE subscription_requests SET status = p_status, reviewed_by = auth.uid(), reviewed_at = now() WHERE id = p_request_id;
  IF p_status = 'approved' THEN
    v_end := current_date + interval '1 month';
    UPDATE profiles SET subscription_active = true, subscription_plan = v_plan, subscription_end_date = v_end WHERE id = v_user;
    INSERT INTO notifications (user_id, type, title, body) VALUES (v_user, 'welcome', 'Subscription activated', 'Your Dahabshil payment was verified and your subscription is active.');
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.review_subscription_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_subscription_request(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_application_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_owner uuid; v_title text; v_type text; v_body text;
BEGIN
  SELECT posted_by, title INTO v_owner, v_title FROM jobs WHERE id = NEW.job_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, type, title, body, job_id, application_id) VALUES (v_owner, 'new_applicant', 'New applicant', 'A teacher submitted an application for "' || v_title || '".', NEW.job_id, NEW.id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_type := CASE WHEN NEW.status = 'accepted' THEN 'application_accepted' ELSE 'application_rejected' END;
    v_body := CASE WHEN NEW.status = 'accepted' THEN 'Your application for "' || v_title || '" was accepted.' ELSE 'Your application for "' || v_title || '" was rejected.' END;
    INSERT INTO notifications (user_id, type, title, body, job_id, application_id) VALUES (NEW.applicant_id, v_type, CASE WHEN NEW.status = 'accepted' THEN 'Application accepted' ELSE 'Application update' END, v_body, NEW.job_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS applications_notify_events ON public.applications;
CREATE TRIGGER applications_notify_events AFTER INSERT OR UPDATE OF status ON public.applications FOR EACH ROW EXECUTE FUNCTION public.notify_application_events();
REVOKE EXECUTE ON FUNCTION public.notify_application_events() FROM PUBLIC, anon, authenticated;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, education_level, field_of_study, graduation_year, is_current_student, profile_picture, academic_title, department, research_fields, institution_name, city, district, neighborhood, school_type, logo, number_of_branches, phone_number) ON public.profiles TO authenticated;
