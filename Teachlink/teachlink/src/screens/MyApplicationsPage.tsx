import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Application } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { EmptyState, SkeletonList } from '../components/Feedback';
import { SectorIcon, LocationIcon } from '../components/Icons';

export function MyApplicationsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApps = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        applied_at,
        status,
        rejection_reason,
        resume_name,
        jobs!inner (id, title, institution_type, location_city)
      `)
      .eq('applicant_id', profile.id)
      .order('applied_at', { ascending: false });
    if (error) {
      console.error('Error fetching applications:', error.message);
    } else {
      setApps((data as unknown as Application[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!profile) return;
    void loadApps();
    const channel = supabase
      .channel('applications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `applicant_id=eq.${profile.id}` }, () => void loadApps())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profile]);

  if (loading) {
    return (
      <div>
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-4">
          <h1 className="text-lg font-bold text-gray-900">My Applications</h1>
          <p className="text-xs text-gray-500">Track the status of your job applications</p>
        </div>
        <div className="px-5 py-4"><SkeletonList count={3} /></div>
      </div>
    );
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
            {apps.map((app, idx) => {
              const job = app.jobs as unknown as { id: string; title: string; institution_type: string; location_city: string };
              return (
                <button
                  key={app.id}
                  onClick={() => navigate(`/jobs/${job?.id}`)}
                  className="card-hover w-full text-left active:scale-[0.98] animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                        <SectorIcon type={job?.institution_type || 'school'} size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{job?.title || 'Unknown position'}</h3>
                        <p className="text-sm text-gray-500 truncate capitalize">{job?.institution_type || ''}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                          {job?.location_city && (
                            <span className="flex items-center gap-1">
                              <LocationIcon size={12} />
                              {job.location_city}
                            </span>
                          )}
                          <span>Applied {new Date(app.applied_at).toLocaleDateString()}</span>
                          {app.resume_name && <span className="truncate text-primary-600">Resume attached</span>}
                        </div>
                        {app.status === 'rejected' && app.rejection_reason && (
                          <p className="mt-1 rounded bg-error-50 px-2 py-1 text-xs text-error-600">Reason: {app.rejection_reason}</p>
                        )}
                        {app.status === 'accepted' && (
                          <p className="mt-1 text-xs text-success-600 font-medium">Selected — the admin will contact you about next steps.</p>
                        )}
                      </div>
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
