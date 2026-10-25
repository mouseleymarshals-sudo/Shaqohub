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

export const CITIES = [
  'Mogadishu city',
  'Hargeysa state',
  'North east state',
  'Galmudug state',
  'Puntland state',
  'Jubbaland state',
  'Hirshabelle state',
  'South west state',
] as const;

export interface SavedJob {
  id: string;
  user_id: string;
  job_id: string;
  saved_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'application_accepted' | 'application_rejected' | 'new_applicant' | 'job_deadline' | 'welcome';
  title: string;
  body: string;
  job_id: string | null;
  application_id: string | null;
  is_read: boolean;
  created_at: string;
}

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
  account_status: 'active' | 'suspended';
  suspended_at: string | null;
  suspension_reason: string | null;
  is_super_admin: boolean;
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
  primary_subjects: string[];
  secondary_subjects: string[];
  position_count: number;
  salary_amount: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  salary_negotiable: boolean;
  location_district: string | null;
  location_village: string | null;
  location_city: string | null;
  requirements: string[];
  phone_number: string | null;
  application_deadline: string | null;
  is_active: boolean;
  created_at: string;
  profiles?: Pick<Profile, 'institution_name' | 'logo'>;
}

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  applied_at: string;
  status: 'pending' | 'accepted' | 'rejected';
  rejection_reason: string | null;
  resume_path: string | null;
  resume_name: string | null;
  resume_size: number | null;
  cover_note: string | null;
  certificates: string[];
  jobs?: Pick<Job, 'id' | 'title' | 'institution_type'>;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'profile_picture' | 'education_level' | 'field_of_study'>;
}

export interface SelectedCandidate {
  id: string;
  application_id: string;
  job_id: string;
  applicant_id: string;
  employer_id: string;
  selected_at: string;
  admin_notes: string | null;
  negotiation_status: 'pending' | 'contacted' | 'agreed' | 'referred';
  monthly_fee: number | null;
  created_at: string;
}

export interface SubscriptionRequest {
  id: string;
  user_id: string;
  plan: 'basic' | 'premium' | 'enterprise';
  payment_reference: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface SupportThread {
  id: string;
  requester_id: string;
  subject: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  created_at: string;
}
