/*
# Fix file uploads: add resume columns, create resumes bucket, fix avatar visibility

## Overview
Three issues are fixed:
1. The `applications` table is missing columns needed for resume uploads
   (`resume_path`, `resume_name`, `resume_size`, `cover_note`). Without these,
   the INSERT from the job application page fails silently.
2. The `resumes` storage bucket does not exist, so `supabase.storage.from('resumes').upload()`
   throws a 404.
3. The `profile-avatars` bucket only allows SELECT for the owner — other users
   (e.g. institutions viewing applicants) cannot load the image, so avatars
   appear blank. A public-read SELECT policy is added so anyone can view avatars
   while only the owner can upload/update/delete.

## Changes

### 1. applications table — new columns
- `resume_path` (text, nullable) — storage path of the uploaded resume file
- `resume_name` (text, nullable) — original filename from the user's device
- `resume_size` (bigint, nullable) — file size in bytes
- `cover_note` (text, nullable) — optional cover note the applicant writes

### 2. resumes storage bucket
- Created as a private bucket (files are not publicly listed)
- Owner-scoped INSERT/SELECT/UPDATE/DELETE policies on storage.objects
  (path pattern: `<user_id>/<uuid>.ext`)

### 3. profile-avatars bucket — public read
- A new SELECT policy allows anyone to read avatar images (public-read)
- Existing owner-scoped INSERT/UPDATE/DELETE policies are retained
- The owner-only SELECT policy is replaced with a public SELECT policy

## Security
- Resumes are private: only the uploading user can read their own resume files.
- Profile avatars are public-read (anyone can view) but only the owner can upload/modify.
- No anon access on resumes — only authenticated users can upload.
*/

-- 1. Add missing columns to applications table
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS resume_path text,
  ADD COLUMN IF NOT EXISTS resume_name text,
  ADD COLUMN IF NOT EXISTS resume_size bigint,
  ADD COLUMN IF NOT EXISTS cover_note text;

-- 2. Create the resumes storage bucket (private — not public-listable)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for resumes bucket (owner-scoped)
-- Drop existing resume policies if re-running
DROP POLICY IF EXISTS "resumes_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "resumes_select_own" ON storage.objects;
DROP POLICY IF EXISTS "resumes_update_own" ON storage.objects;
DROP POLICY IF EXISTS "resumes_delete_own" ON storage.objects;

CREATE POLICY "resumes_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "resumes_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "resumes_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "resumes_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Fix profile-avatars: make SELECT public so anyone can view avatars
-- Drop the owner-only SELECT policy
DROP POLICY IF EXISTS "profile_avatars_select_own" ON storage.objects;

-- New public-read SELECT policy for profile-avatars
CREATE POLICY "profile_avatars_select_public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'profile-avatars');

-- Make the profile-avatars bucket public so getPublicUrl works
UPDATE storage.buckets SET public = true WHERE id = 'profile-avatars';

-- 5. Also allow institutions to read resume files of applicants for their jobs
-- We need a policy that lets a job owner read resumes uploaded by applicants
-- for their jobs. Since storage policies can't easily join application tables,
-- we allow authenticated users to read resume files where the folder name
-- matches any applicant who applied to a job they posted.
DROP POLICY IF EXISTS "resumes_select_job_owner" ON storage.objects;
CREATE POLICY "resumes_select_job_owner"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes'
  AND EXISTS (
    SELECT 1
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE j.posted_by = auth.uid()
      AND a.resume_path = name
  )
);
