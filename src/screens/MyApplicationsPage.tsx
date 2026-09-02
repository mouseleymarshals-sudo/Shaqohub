import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Application } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Spinner, EmptyState } from '../components/Feedback';

export function MyApplicationsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          job_id,
          applied_at,
          status,
          jobs!inner (id, title, institution_type, location_city),
          profiles!jobs_posted_by_fkey (institution_name)
        `)
        .eq('applicant_id', profile.id)
        .order('applied_at', { ascending: false });
      if (error) {
        console.error('Error fetching applications:', error.message);
      } else {
        setApps((data as unknown as Application[]) || []);
      }
      setLoading(false);
    })();
  }, [profile]);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-4">
        <h1 className="text-lg font-bold text-gray-900">My Applications</h1>
        <p className="text-xs text-gray-500">Track the status of your job applications</p>
      </div>

      <div className="px-5 py-4">
        {apps.length === 0 ? (
          <EmptyState
            icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            title="No applications yet"
            message="Browse available jobs and apply to start your teaching career."
          />
        ) : (
          <div className="space-y-3">
            {apps.map((app) => {
              const job = app.jobs as unknown as { id: string; title: string; institution_type: string; location_city: string };
              const institution = (app.profiles as unknown as { institution_name: string }) || { institution_name: 'Unknown' };
              return (
                <button
                  key={app.id}
                  onClick={() => navigate(`/jobs/${job?.id}`)}
                  className="card w-full text-left hover:shadow-md transition-all active:scale-[0.98] animate-fade-in"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{job?.title || 'Unknown position'}</h3>
                      <p className="text-sm text-gray-500 truncate">{institution.institution_name}</p>
                      {job?.location_city && <p className="text-xs text-gray-400 mt-0.5">{job.location_city}</p>}
                      <p className="text-xs text-gray-400 mt-1">Applied on {new Date(app.applied_at).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-accent-100 text-accent-700',
    accepted: 'bg-success-100 text-success-700',
    rejected: 'bg-error-100 text-error-700',
  };
  const labels: Record<string, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };
  return <span className={`badge ${styles[status] || 'bg-gray-100 text-gray-600'}`}>{labels[status] || status}</span>;
}
