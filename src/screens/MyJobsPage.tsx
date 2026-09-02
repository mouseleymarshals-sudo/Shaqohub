import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Job, Application } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Spinner, EmptyState } from '../components/Feedback';

interface JobWithApps extends Job {
  applications?: Application[];
}

export function MyJobsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithApps[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchJobs = async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        applications (
          id,
          applicant_id,
          applied_at,
          status,
          profiles!applicant_id (id, full_name, profile_picture, phone_number, education_level, field_of_study)
        )
      `)
      .eq('posted_by', profile.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching jobs:', error.message);
    } else {
      setJobs((data as unknown as JobWithApps[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, [profile]);

  const updateAppStatus = async (appId: string, status: 'accepted' | 'rejected') => {
    setUpdatingId(appId);
    const { error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', appId);
    if (!error) {
      await fetchJobs();
    }
    setUpdatingId(null);
  };

  const toggleJobActive = async (jobId: string, current: boolean) => {
    const { error } = await supabase.from('jobs').update({ is_active: !current }).eq('id', jobId);
    if (!error) fetchJobs();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-4">
        <h1 className="text-lg font-bold text-gray-900">My Job Postings</h1>
        <p className="text-xs text-gray-500">Manage your listings and review applications</p>
      </div>

      <div className="px-5 py-4">
        {jobs.length === 0 ? (
          <EmptyState
            icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" /></svg>}
            title="No job postings yet"
            message="Create your first job posting to start receiving applications from teachers."
          />
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const apps = job.applications || [];
              const pending = apps.filter((a) => a.status === 'pending').length;
              const isExpanded = expandedJob === job.id;
              return (
                <div key={job.id} className="card animate-fade-in">
                  <button
                    onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(job.created_at).toLocaleDateString()} · {job.is_active ? 'Active' : 'Closed'}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="badge bg-gray-100 text-gray-600">{apps.length} {apps.length === 1 ? 'application' : 'applications'}</span>
                          {pending > 0 && <span className="badge bg-accent-100 text-accent-700">{pending} pending</span>}
                        </div>
                      </div>
                      <svg className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  </button>

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => navigate(`/jobs/${job.id}`)} className="text-xs font-medium text-primary-600 hover:underline">View Details</button>
                    <span className="text-gray-200">|</span>
                    <button onClick={() => toggleJobActive(job.id, job.is_active)} className="text-xs font-medium text-gray-500 hover:underline">
                      {job.is_active ? 'Close Listing' : 'Reopen'}
                    </button>
                  </div>

                  {/* Applications */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-gray-100 pt-4 space-y-3 animate-fade-in">
                      {apps.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-2">No applications yet.</p>
                      ) : (
                        apps.map((app) => {
                          const applicant = app.profiles as unknown as Application['profiles'];
                          return (
                            <div key={app.id} className="rounded-xl bg-gray-50 p-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                                  {applicant?.full_name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{applicant?.full_name || 'Unknown'}</p>
                                  <p className="text-xs text-gray-400">
                                    {applicant?.education_level || ''} {applicant?.field_of_study ? `· ${applicant.field_of_study}` : ''}
                                  </p>
                                </div>
                                <StatusBadge status={app.status} />
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                {app.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => updateAppStatus(app.id, 'accepted')}
                                      disabled={updatingId === app.id}
                                      className="flex-1 rounded-lg bg-success-500 py-2 text-xs font-semibold text-white hover:bg-success-600 disabled:opacity-50"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => updateAppStatus(app.id, 'rejected')}
                                      disabled={updatingId === app.id}
                                      className="flex-1 rounded-lg bg-gray-200 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-300 disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {applicant?.phone_number && app.status !== 'pending' && (
                                  <a href={`tel:${applicant.phone_number}`} className="text-xs font-medium text-primary-600">
                                    {applicant.phone_number}
                                  </a>
                                )}
                                {updatingId === app.id && <Spinner size={14} />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
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
  return <span className={`badge capitalize ${styles[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}
