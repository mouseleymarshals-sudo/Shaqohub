import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Job } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { SkeletonCard } from '../components/Feedback';

interface AppRow {
  id: string;
  status: string;
  applicant_id: string;
  profiles: { full_name: string | null; education_level: string | null; field_of_study: string | null } | null;
}

export function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeJobs, setActiveJobs] = useState(0);
  const [totalApps, setTotalApps] = useState(0);
  const [pendingApps, setPendingApps] = useState(0);
  const [acceptedApps, setAcceptedApps] = useState(0);
  const [recentApps, setRecentApps] = useState<AppRow[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: jobsData } = await supabase.from('jobs').select('*').eq('posted_by', profile.id).order('created_at', { ascending: false });
      const jobRows = (jobsData || []) as Job[];
      const jobIds = jobRows.map((j) => j.id);

      const { data: appsData } = await supabase.from('applications')
        .select(`
          id, status, applicant_id,
          profiles!applicant_id (full_name, education_level, field_of_study)
        `)
        .in('job_id', jobIds.length > 0 ? jobIds : ['00000000-0000-0000-0000-000000000000'])
        .order('applied_at', { ascending: false });

      setActiveJobs(jobRows.filter((j) => j.is_active).length);
      setRecentJobs(jobRows.slice(0, 3));

      const allApps = (appsData || []) as unknown as AppRow[];
      setTotalApps(allApps.length);
      setPendingApps(allApps.filter((a) => a.status === 'pending').length);
      setAcceptedApps(allApps.filter((a) => a.status === 'accepted').length);
      setRecentApps(allApps.slice(0, 4));

      setLoading(false);
    })();
  }, [profile]);

  if (loading) {
    return (
      <div className="px-5 py-4">
        <div className="space-y-3">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-24 rounded-2xl" />
            <div className="skeleton h-24 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-4">
        <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
        <p className="text-xs text-gray-500">Overview of your hiring activity</p>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Hero stats */}
        <div className="rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
          <div className="relative">
            <p className="text-sm text-white/70 font-medium">Total Applications</p>
            <p className="text-4xl font-bold mt-1">{totalApps}</p>
            <div className="mt-4 flex gap-4">
              <div>
                <p className="text-xs text-white/60">Pending</p>
                <p className="text-lg font-bold">{pendingApps}</p>
              </div>
              <div>
                <p className="text-xs text-white/60">Accepted</p>
                <p className="text-lg font-bold">{acceptedApps}</p>
              </div>
              <div>
                <p className="text-xs text-white/60">Active Jobs</p>
                <p className="text-lg font-bold">{activeJobs}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/post-job')}
            className="card-hover text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 mb-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-900">Post a Job</p>
            <p className="text-xs text-gray-400 mt-0.5">Create new listing</p>
          </button>
          <button
            onClick={() => navigate('/my-jobs')}
            className="card-hover text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600 mb-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-900">Manage Jobs</p>
            <p className="text-xs text-gray-400 mt-0.5">Review applications</p>
          </button>
        </div>

        {/* Recent applications */}
        {recentApps.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Recent Applications</h2>
              <button onClick={() => navigate('/my-jobs')} className="text-xs font-medium text-primary-600 hover:underline">View all</button>
            </div>
            <div className="space-y-2">
              {recentApps.map((app) => (
                <div key={app.id} className="card !p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                      {app.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{app.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{app.profiles?.education_level || ''} {app.profiles?.field_of_study ? `· ${app.profiles.field_of_study}` : ''}</p>
                    </div>
                    <span className={`badge capitalize ${
                      app.status === 'pending' ? 'bg-accent-100 text-accent-700' :
                      app.status === 'accepted' ? 'bg-success-100 text-success-700' :
                      'bg-error-100 text-error-700'
                    }`}>{app.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent job postings */}
        {recentJobs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Recent Job Posts</h2>
              <button onClick={() => navigate('/my-jobs')} className="text-xs font-medium text-primary-600 hover:underline">View all</button>
            </div>
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="card-hover w-full text-left !p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{job.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{job.is_active ? 'Active' : 'Closed'} · {new Date(job.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`badge ${job.is_active ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
                      {job.is_active ? 'Active' : 'Closed'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {totalApps === 0 && recentJobs.length === 0 && (
          <div className="text-center py-10">
            <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gray-50 text-gray-300 ring-1 ring-gray-100">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" /></svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900">No activity yet</h3>
            <p className="mt-1.5 text-sm text-gray-500 max-w-xs mx-auto">Post your first job to start receiving applications from teachers.</p>
            <button onClick={() => navigate('/post-job')} className="btn-primary mt-4">Post a Job</button>
          </div>
        )}
      </div>
    </div>
  );
}
