/*
# Privacy controls, selected candidates, and job post enhancements

## Overview
This migration restructures TeachLink to enforce strict privacy:
1. Employers cannot see applicant phone numbers or emails.
2. Institution names are hidden from job seekers on job listings.
3. When an employer accepts an applicant, the candidate is automatically added to a private list only the Super Admin can see.
4. Employers must provide a rejection reason when rejecting.
5. Job posts gain position count, primary/secondary subjects, and negotiable salary fields.
6. Messaging tables (conversations, messages) are retained in the schema but their RLS is locked down so the frontend cannot use them.

## New Tables
### selected_candidates
- `id` (uuid PK)
- `application_id` (uuid FK to applications, cascade delete)
- `job_id` (uuid FK to jobs, cascade delete)
- `applicant_id` (uuid FK to profiles, cascade delete)
- `employer_id` (uuid FK to profiles, cascade delete)
- `selected_at` (timestamptz, default now())
- `admin_notes` (text, nullable — for Super Admin's negotiation notes)
- `negotiation_status` (text: pending, contacted, agreed, referred — default pending)
- `monthly_fee` (numeric, nullable — set by Super Admin)
- UNIQUE constraint on application_id to prevent duplicates.

## Modified Tables
### jobs
- Added `position_count` (integer, default 1) — number of positions available.
- Added `primary_subjects` (text[], default '{}') — main subjects required.
- Added `secondary_subjects` (text[], default '{}') — optional/secondary subjects.
- Added `salary_negotiable` (boolean, default false) — marks salary as negotiable instead of a fixed amount.

### applications
- Added `rejection_reason` (text, nullable) — required when status is rejected.
- Added `certificates` (text[], default '{}') — list of certificate names uploaded.

## Security Changes
### selected_candidates
- RLS enabled.
- Only Super Admin can SELECT, UPDATE (admin notes, negotiation status, fee).
- Employers can INSERT (via SECURITY DEFINER function only, not directly).
- No DELETE from frontend.

### jobs SELECT policy updated
- The jobs SELECT policy stays open to authenticated users (job seekers need to browse).
- BUT the frontend will no longer select the `profiles!posted_by` relationship for job seekers, so institution names stay hidden at the query level.

### applications SELECT policy updated
- Employers can still see applications on their jobs, BUT the frontend will exclude phone_number and email from the select columns. The RLS policy itself doesn't change — column-level hiding is enforced in the frontend query, not RLS, since profiles have a single SELECT policy.

### SECURITY DEFINER function: accept_applicant
- Called by employers when they accept an applicant.
- Verifies the caller is the job poster.
- Updates application status to 'accepted'.
- Inserts a row into selected_candidates (idempotent via UNIQUE constraint).
- Returns the selected_candidate id.
- REVOKE from PUBLIC/anon, GRANT to authenticated.

### SECURITY DEFINER function: reject_applicant
- Called by employers when they reject an applicant.
- Verifies the caller is the job poster.
- Requires a rejection reason (non-empty).
- Updates application status to 'rejected' and stores the reason.
- REVOKE from PUBLIC/anon, GRANT to authenticated.

### Messaging lock-down
- conversations and messages SELECT/INSERT/UPDATE policies are dropped (effectively removing frontend access).
- Grants on conversations and messages are revoked from authenticated.
- The messaging tables remain in the database but are inaccessible from the Data API.

## Notes
1. The selected_candidates table is the Super Admin's private list. Only is_super_admin = true profiles can read it.
2. The accept_applicant function is the ONLY way to create a selected_candidate row — employers cannot insert directly.
3. Rejection reasons are visible to the applicant in their notifications and application status.
4. The notification trigger (notify_application_events) already handles accepted/rejected notifications.
5. Job posts now support separate primary and secondary subjects, position counts, and a salary_negotiable flag.
*/

-- Add columns to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS position_count int NOT NULL DEFAULT 1;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS primary_subjects text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS secondary_subjects text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_negotiable boolean NOT NULL DEFAULT false;

-- Add columns to applications
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS certificates text[] NOT NULL DEFAULT '{}';

-- Create selected_candidates table
CREATE TABLE IF NOT EXISTS public.selected_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_at timestamptz NOT NULL DEFAULT now(),
  admin_notes text,
  negotiation_status text NOT NULL DEFAULT 'pending' CHECK (negotiation_status IN ('pending', 'contacted', 'agreed', 'referred')),
  monthly_fee numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT selected_candidates_application_unique UNIQUE (application_id)
);

CREATE INDEX IF NOT EXISTS selected_candidates_applicant_idx ON public.selected_candidates(applicant_id);
CREATE INDEX IF NOT EXISTS selected_candidates_employer_idx ON public.selected_candidates(employer_id);
CREATE INDEX IF NOT EXISTS selected_candidates_status_idx ON public.selected_candidates(negotiation_status);

ALTER TABLE public.selected_candidates ENABLE ROW LEVEL SECURITY;

-- Only Super Admin can read selected candidates
DROP POLICY IF EXISTS "selected_candidates_select_admin" ON public.selected_candidates;
CREATE POLICY "selected_candidates_select_admin" ON public.selected_candidates FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin));

-- Only Super Admin can update (admin notes, negotiation status, fee)
DROP POLICY IF EXISTS "selected_candidates_update_admin" ON public.selected_candidates;
CREATE POLICY "selected_candidates_update_admin" ON public.selected_candidates FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin));

GRANT SELECT, UPDATE ON public.selected_candidates TO authenticated;

-- SECURITY DEFINER: accept_applicant — called by employer, creates selected_candidate
CREATE OR REPLACE FUNCTION public.accept_applicant(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_job_id uuid; v_applicant uuid; v_poster uuid; v_sc_id uuid;
BEGIN
  SELECT a.job_id, a.applicant_id, j.posted_by INTO v_job_id, v_applicant, v_poster
  FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = p_application_id;

  IF v_poster IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF auth.uid() IS NULL OR auth.uid() <> v_poster THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE applications SET status = 'accepted' WHERE id = p_application_id;

  INSERT INTO selected_candidates (application_id, job_id, applicant_id, employer_id)
  VALUES (p_application_id, v_job_id, v_applicant, v_poster)
  ON CONFLICT (application_id) DO NOTHING
  RETURNING id INTO v_sc_id;

  IF v_sc_id IS NULL THEN
    SELECT id INTO v_sc_id FROM selected_candidates WHERE application_id = p_application_id;
  END IF;

  RETURN v_sc_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.accept_applicant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_applicant(uuid) TO authenticated;

-- SECURITY DEFINER: reject_applicant — called by employer, requires rejection reason
CREATE OR REPLACE FUNCTION public.reject_applicant(p_application_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_poster uuid;
BEGIN
  SELECT j.posted_by INTO v_poster
  FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = p_application_id;

  IF v_poster IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF auth.uid() IS NULL OR auth.uid() <> v_poster THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'Rejection reason is required'; END IF;

  UPDATE applications SET status = 'rejected', rejection_reason = trim(p_reason) WHERE id = p_application_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.reject_applicant(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_applicant(uuid, text) TO authenticated;

-- SECURITY DEFINER: update_selected_candidate — Super Admin updates negotiation notes/status/fee
CREATE OR REPLACE FUNCTION public.update_selected_candidate(
  p_sc_id uuid,
  p_notes text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_fee numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'contacted', 'agreed', 'referred') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE selected_candidates SET
    admin_notes = COALESCE(p_notes, admin_notes),
    negotiation_status = COALESCE(p_status, negotiation_status),
    monthly_fee = COALESCE(p_fee, monthly_fee)
  WHERE id = p_sc_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_selected_candidate(uuid, text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_selected_candidate(uuid, text, text, numeric) TO authenticated;

-- Lock down messaging: revoke grants and drop policies so the frontend can't reach conversations/messages
REVOKE SELECT, INSERT, UPDATE ON public.conversations FROM authenticated;
REVOKE SELECT, INSERT, UPDATE ON public.messages FROM authenticated;
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_participant" ON public.conversations;
DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_sender_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_update_recipient_read" ON public.messages;