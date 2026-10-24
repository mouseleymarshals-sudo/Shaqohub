import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Job } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { EmptyState, SkeletonList } from '../components/Feedback';
import { SectorIcon, LocationIcon, SalaryIcon } from '../components/Icons';

interface SavedJobRow {
  id: string;
  job_id: string;
  saved_at: string;
  jobs: Job | null;
}

export function SavedJobsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('saved_jobs')
      .select(`
        id, job_id, saved_at,
        jobs!inner (id, posted_by, institution_type, title, description, teacher_type, subjects, salary_amount, salary_currency, salary_period, location_district, location_village, location_city, requirements, phone_number, application_deadline, is_active, created_at, profiles!posted_by (institution_name, logo))
      `)
      .eq('user_id', profile.id)
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved jobs:', error.message);
    } else {
      const rows = (data || []) as unknown as SavedJobRow[];
      const jobs = rows.map((r) => r.jobs).filter(Boolean) as Job[];
      const activeJobs = jobs.filter((j) => j.is_active);
      setSaved(activeJobs);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const handleRemove = async (jobId: string) => {
    if (!profile) return;
    setSaved((prev) => prev.filter((j) => j.id !== jobId));
    await supabase.from('saved_jobs').delete().eq('user_id', profile.id).eq('job_id', jobId);
  };

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-4">
        <h1 className="text-lg font-bold text-gray-900">Saved Jobs</h1>
        <p className="text-xs text-gray-500">Jobs you've bookmarked for later</p>
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <SkeletonList count={3} />
        ) : saved.length === 0 ? (
          <EmptyState
            icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            title="No saved jobs yet"
            message="Tap the bookmark icon on any job to save it for later."
          />
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium">{saved.length} saved {saved.length === 1 ? 'job' : 'jobs'}</p>
            {saved.map((job, idx) => (
              <div
                key={job.id}
                className="card animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <button
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <SectorIcon type={job.institution_type} size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                      <p className="text-sm text-gray-500 truncate">{job.profiles?.institution_name || 'Unknown institution'}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.subjects?.slice(0, 3).map((s, i) => (
                          <span key={i} className="badge bg-primary-50 text-primary-700">{s}</span>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                        {job.location_city && (
                          <span className="flex items-center gap-1">
                            <LocationIcon size={12} />
                            {job.location_city}
                          </span>
                        )}
                        {job.salary_amount && (
                          <span className="flex items-center gap-1">
                            <SalaryIcon size={12} />
                            {job.salary_amount.toLocaleString()} {job.salary_currency}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
                <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
                  <button
                    onClick={() => handleRemove(job.id)}
                    className="text-xs font-medium text-error-500 hover:text-error-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
