/*
# Add saved jobs and notifications tables for TeachLink

## Overview
Adds two new tables to support job bookmarking and in-app notifications:
1. `saved_jobs` — teachers can bookmark jobs to review later
2. `notifications` — users receive notifications about application status changes, new applicants, etc.

## Tables

### saved_jobs
- `id` (uuid, PK)
- `user_id` (uuid, references profiles, defaults to auth.uid())
- `job_id` (uuid, references jobs, cascade delete)
- `saved_at` (timestamptz, defaults to now())
- Unique constraint on (user_id, job_id) to prevent duplicate saves

### notifications
- `id` (uuid, PK)
- `user_id` (uuid, references profiles, defaults to auth.uid())
- `type` (text: application_accepted, application_rejected, new_applicant, job_deadline)
- `title` (text)
- `body` (text)
- `job_id` (uuid, references jobs, cascade delete, nullable)
- `application_id` (uuid, references applications, cascade delete, nullable)
- `is_read` (boolean, default false)
- `created_at` (timestamptz, defaults to now())

## Security (RLS)
- saved_jobs: owner-scoped CRUD (users manage their own saved jobs)
- notifications: users can read and update (mark as read) their own notifications

## Notes
1. A unique constraint on saved_jobs (user_id, job_id) prevents duplicate bookmarks.
2. Notifications are read-only from the client except for marking as read.
3. Indexes on user_id for both tables for query performance.
*/

-- Saved jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON saved_jobs TO authenticated;

DROP POLICY IF EXISTS "saved_jobs_select_own" ON saved_jobs;
CREATE POLICY "saved_jobs_select_own" ON saved_jobs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_jobs_insert_own" ON saved_jobs;
CREATE POLICY "saved_jobs_insert_own" ON saved_jobs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_jobs_delete_own" ON saved_jobs;
CREATE POLICY "saved_jobs_delete_own" ON saved_jobs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('application_accepted', 'application_rejected', 'new_applicant', 'job_deadline', 'welcome')),
  title text NOT NULL,
  body text NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
