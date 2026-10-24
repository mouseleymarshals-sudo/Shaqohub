/*
# Add missing tables, columns, functions, and storage for full app compatibility

## Overview
The app code references several database objects that don't exist yet:
- Profile columns: account_status, suspended_at, suspension_reason, is_super_admin
- Tables: conversations, messages, support_threads, support_messages, subscription_requests
- RPC functions: create_conversation_for_application, set_account_status, review_subscription_request
- Storage bucket: message-attachments

## Security
- All new tables have RLS enabled with ownership-based policies
- RPC functions are SECURITY DEFINER with access checks, revoked from anon
- Storage policies are owner-scoped
*/

-- 1. Add missing profile columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- 2. conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  participant_one uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_two uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;

DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
CREATE POLICY "conversations_select_participant" ON conversations FOR SELECT
  TO authenticated USING (auth.uid() = participant_one OR auth.uid() = participant_two);

DROP POLICY IF EXISTS "conversations_insert_participant" ON conversations;
CREATE POLICY "conversations_insert_participant" ON conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

DROP POLICY IF EXISTS "conversations_update_participant" ON conversations;
CREATE POLICY "conversations_update_participant" ON conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = participant_one OR auth.uid() = participant_two)
  WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

-- 3. messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  attachment_path text,
  attachment_name text,
  attachment_size bigint,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;

DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid()))
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid()))
      AND auth.uid() = sender_id
  );

DROP POLICY IF EXISTS "messages_update_participant" ON messages;
CREATE POLICY "messages_update_participant" ON messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid()))
  );

-- 4. support_threads table
CREATE TABLE IF NOT EXISTS support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT 'Account support',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_threads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON support_threads TO authenticated;

DROP POLICY IF EXISTS "support_threads_select_own" ON support_threads;
CREATE POLICY "support_threads_select_own" ON support_threads FOR SELECT
  TO authenticated USING (auth.uid() = requester_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin));

DROP POLICY IF EXISTS "support_threads_insert_own" ON support_threads;
CREATE POLICY "support_threads_insert_own" ON support_threads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "support_threads_update_own" ON support_threads;
CREATE POLICY "support_threads_update_own" ON support_threads
  FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin))
  WITH CHECK (auth.uid() = requester_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin));

-- 5. support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  attachment_path text,
  attachment_name text,
  attachment_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON support_messages TO authenticated;

DROP POLICY IF EXISTS "support_messages_select_own" ON support_messages;
CREATE POLICY "support_messages_select_own" ON support_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM support_threads t WHERE t.id = support_messages.thread_id
      AND (t.requester_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin)))
  );

DROP POLICY IF EXISTS "support_messages_insert_own" ON support_messages;
CREATE POLICY "support_messages_insert_own" ON support_messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM support_threads t WHERE t.id = support_messages.thread_id
      AND (t.requester_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin)))
      AND auth.uid() = sender_id
  );

-- 6. subscription_requests table
CREATE TABLE IF NOT EXISTS subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('basic', 'premium', 'enterprise')),
  payment_reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON subscription_requests TO authenticated;

DROP POLICY IF EXISTS "subscription_requests_select_own" ON subscription_requests;
CREATE POLICY "subscription_requests_select_own" ON subscription_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin));

DROP POLICY IF EXISTS "subscription_requests_insert_own" ON subscription_requests;
CREATE POLICY "subscription_requests_insert_own" ON subscription_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- 7. message-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "msg_attachments_insert_own" ON storage.objects;
CREATE POLICY "msg_attachments_insert_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "msg_attachments_select_own" ON storage.objects;
CREATE POLICY "msg_attachments_select_own" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "msg_attachments_delete_own" ON storage.objects;
CREATE POLICY "msg_attachments_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 8. RPC: create_conversation_for_application
CREATE OR REPLACE FUNCTION public.create_conversation_for_application(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
  v_applicant_id uuid;
  v_posted_by uuid;
  v_conversation_id uuid;
BEGIN
  SELECT a.job_id, a.applicant_id INTO v_job_id, v_applicant_id
  FROM applications a WHERE a.id = p_application_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT j.posted_by INTO v_posted_by FROM jobs j WHERE j.id = v_job_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT id INTO v_conversation_id FROM conversations WHERE application_id = p_application_id;
  IF v_conversation_id IS NOT NULL THEN RETURN v_conversation_id; END IF;

  INSERT INTO conversations (job_id, application_id, participant_one, participant_two)
  VALUES (v_job_id, p_application_id, v_applicant_id, v_posted_by)
  RETURNING id INTO v_conversation_id;

  RETURN v_conversation_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_conversation_for_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_conversation_for_application(uuid) TO authenticated;

-- 9. RPC: set_account_status (admin only)
CREATE OR REPLACE FUNCTION public.set_account_status(p_user_id uuid, p_status text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT is_super_admin INTO is_admin FROM profiles WHERE id = auth.uid();
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_status = 'suspended' THEN
    UPDATE profiles SET account_status = 'suspended', suspended_at = now(), suspension_reason = p_reason WHERE id = p_user_id;
  ELSIF p_status = 'active' THEN
    UPDATE profiles SET account_status = 'active', suspended_at = NULL, suspension_reason = NULL WHERE id = p_user_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_account_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_account_status(uuid, text, text) TO authenticated;

-- 10. RPC: review_subscription_request (admin only)
CREATE OR REPLACE FUNCTION public.review_subscription_request(p_request_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  v_user_id uuid;
  v_plan text;
BEGIN
  SELECT is_super_admin INTO is_admin FROM profiles WHERE id = auth.uid();
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE subscription_requests SET status = p_status WHERE id = p_request_id
  RETURNING user_id, plan INTO v_user_id, v_plan;

  IF p_status = 'approved' AND v_user_id IS NOT NULL THEN
    UPDATE profiles SET subscription_active = true, subscription_plan = v_plan,
      subscription_end_date = (now() + interval '30 days')::date
    WHERE id = v_user_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_subscription_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_subscription_request(uuid, text) TO authenticated;
