/*
# Add secure TeachLink profile avatars

## Overview
Creates a private Supabase Storage bucket for profile images and adds owner-scoped storage policies. Existing profile rows already contain the `profile_picture` path column, so no user data is changed.

## Storage
- Bucket `profile-avatars` — private bucket for uploaded profile images.
- Object paths must begin with the authenticated user's UUID, followed by the uploaded filename.

## Security
- Authenticated users may upload only into their own folder.
- Authenticated users may read only objects in their own folder, which supports short-lived signed URLs in the dashboard.
- Authenticated users may update or delete only objects in their own folder.
- Anonymous users cannot access this bucket.

## Important notes
1. The browser stores only the private storage path in `profiles.profile_picture`, never a permanent public URL.
2. The application creates short-lived signed URLs when displaying the current user's avatar.
3. File type and size validation is performed before upload in the application, while storage policies enforce ownership at the database boundary.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "profile_avatars_insert_own" ON storage.objects;
CREATE POLICY "profile_avatars_insert_own" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "profile_avatars_select_own" ON storage.objects;
CREATE POLICY "profile_avatars_select_own" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "profile_avatars_update_own" ON storage.objects;
CREATE POLICY "profile_avatars_update_own" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "profile_avatars_delete_own" ON storage.objects;
CREATE POLICY "profile_avatars_delete_own" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
