import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'school_teacher' | 'university_lecturer' | 'school' | 'university';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  education_level: string | null;
  field_of_study: string | null;
  graduation_year: number | null;
  is_current_student: boolean | null;
  profile_picture: string | null;
  academic_title: string | null;
  department: string | null;
  research_fields: string[] | null;
  institution_name: string | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  school_type: string | null;
  logo: string | null;
  number_of_branches: number | null;
  phone_number: string | null;
  subscription_active: boolean | null;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  posted_by: string;
  institution_type: 'school' | 'university';
  title: string;
  description: string;
  teacher_type: string | null;
  subjects: string[];
  salary_amount: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  location_district: string | null;
  location_village: string | null;
  location_city: string | null;
  requirements: string[];
  phone_number: string | null;
  application_deadline: string | null;
  is_active: boolean;
  created_at: string;
  profiles?: Pick<Profile, 'institution_name' | 'logo' | 'phone_number'>;
}

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  applied_at: string;
  status: 'pending' | 'accepted' | 'rejected';
  jobs?: Pick<Job, 'id' | 'title' | 'institution_type'>;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'profile_picture' | 'phone_number' | 'education_level' | 'field_of_study'>;
}
