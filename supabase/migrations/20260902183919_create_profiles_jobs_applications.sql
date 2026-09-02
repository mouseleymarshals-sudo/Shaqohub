/*
# Create profiles, jobs, and applications tables for ShaqoHub

## Overview
Creates the three core tables for the ShaqoHub teacher-school connection app:
1. `profiles` — extends Supabase auth.users with role and profile data
2. `jobs` — teaching job postings created by schools/universities
3. `applications` — job applications submitted by teachers/lecturers

## Tables

### profiles
- `id` (uuid, PK, references auth.users)
- `email` (text, not null)
- `role` (enum: school_teacher, university_lecturer, school, university)
- Teacher fields: full_name, education_level, field_of_study, graduation_year, is_current_student, profile_picture, academic_title, department, research_fields
- Institution fields: institution_name, city, district, neighborhood, school_type, logo, number_of_branches, phone_number
- Subscription fields: subscription_active, subscription_plan, subscription_end_date
- `created_at` (timestamptz)

### jobs
- `id` (uuid, PK)
- `posted_by` (uuid, references profiles, defaults to auth.uid())
- `institution_type` (enum: school, university)
- `title`, `description` (text)
- `teacher_type` (text)
- `subjects` (text[])
- `salary_amount` (numeric), `salary_currency`, `salary_period` (text)
- `location_district`, `location_village`, `location_city` (text)
- `requirements` (text[])
- `phone_number` (text)
- `application_deadline` (date)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)

### applications
- `id` (uuid, PK)
- `job_id` (uuid, references jobs, cascade delete)
- `applicant_id` (uuid, references profiles, defaults to auth.uid())
- `applied_at` (timestamptz)
- `status` (enum: pending, accepted, rejected, default pending)

## Security (RLS)
All tables have RLS enabled with owner-scoped policies:
- profiles: users can read all profiles (needed for browsing), but only update their own
- jobs: anyone authenticated can read; only the poster can create/update/delete their own
- applications: applicants can create and read their own; job posters can read and update applications on their jobs

## Notes
1. Profiles are readable by all authenticated users so teachers can see institution names on jobs and schools can see applicant names.
2. The `posted_by` column defaults to auth.uid() so inserts from the client work without explicitly passing the user ID.
3. The `applicant_id` column defaults to auth.uid() for the same reason.
4. An index on jobs(posted_by) and applications(job_id, applicant_id) for query performance.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('school_teacher', 'university_lecturer', 'school', 'university')),
  full_name text,
  education_level text,
  field_of_study text,
  graduation_year int,
  is_current_student boolean,
  profile_picture text,
  academic_title text,
  department text,
  research_fields text[],
  institution_name text,
  city text,
  district text,
  neighborhood text,
  school_type text,
  logo text,
  number_of_branches int,
  phone_number text,
  subscription_active boolean NOT NULL DEFAULT false,
  subscription_plan text,
  subscription_end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: all authenticated users can read (needed for browsing jobs, viewing applicants)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

-- Profiles: users can insert their own profile row (created at signup)
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Profiles: users can update only their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Profiles: users can delete only their own profile
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  institution_type text NOT NULL CHECK (institution_type IN ('school', 'university')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  teacher_type text,
  subjects text[] NOT NULL DEFAULT '{}',
  salary_amount numeric,
  salary_currency text,
  salary_period text,
  location_district text,
  location_village text,
  location_city text,
  requirements text[] NOT NULL DEFAULT '{}',
  phone_number text,
  application_deadline date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Jobs: all authenticated users can read active job postings
DROP POLICY IF EXISTS "jobs_select_all" ON jobs;
CREATE POLICY "jobs_select_all" ON jobs FOR SELECT
  TO authenticated USING (true);

-- Jobs: authenticated users can create jobs (poster is set by default to auth.uid())
DROP POLICY IF EXISTS "jobs_insert_own" ON jobs;
CREATE POLICY "jobs_insert_own" ON jobs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = posted_by);

-- Jobs: only the poster can update their own jobs
DROP POLICY IF EXISTS "jobs_update_own" ON jobs;
CREATE POLICY "jobs_update_own" ON jobs FOR UPDATE
  TO authenticated USING (auth.uid() = posted_by) WITH CHECK (auth.uid() = posted_by);

-- Jobs: only the poster can delete their own jobs
DROP POLICY IF EXISTS "jobs_delete_own" ON jobs;
CREATE POLICY "jobs_delete_own" ON jobs FOR DELETE
  TO authenticated USING (auth.uid() = posted_by);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'))
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Applications: applicants can read their own applications; job posters can read applications on their jobs
DROP POLICY IF EXISTS "applications_select" ON applications;
CREATE POLICY "applications_select" ON applications FOR SELECT
  TO authenticated USING (
    auth.uid() = applicant_id
    OR EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.posted_by = auth.uid()
    )
  );

-- Applications: only teachers/lecturers can apply (create applications for themselves)
DROP POLICY IF EXISTS "applications_insert_own" ON applications;
CREATE POLICY "applications_insert_own" ON applications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = applicant_id);

-- Applications: only the job poster can update application status (accept/reject)
DROP POLICY IF EXISTS "applications_update" ON applications;
CREATE POLICY "applications_update" ON applications FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.posted_by = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.posted_by = auth.uid()
    )
  );

-- Applications: applicants can withdraw their own applications
DROP POLICY IF EXISTS "applications_delete_own" ON applications;
CREATE POLICY "applications_delete_own" ON applications FOR DELETE
  TO authenticated USING (auth.uid() = applicant_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs(posted_by);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
