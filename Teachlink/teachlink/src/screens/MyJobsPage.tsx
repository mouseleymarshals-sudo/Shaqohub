import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Job } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { EmptyState, SkeletonList, Spinner } from '../components/Feedback';

interface ApplicantInfo {
  id: string;
  full_name: string | null;
  profile_picture: string | null;
  education_level: string | null;
  field_of_study: string | null;
}

interface AppItem {
  id: string;
  applicant_id: string;
  applied_at: string;
  status: 'pending' | 'accepted' | 'rejected';
  rejection_reason: string | null;
  resume_path: string | null;
  resume_name: string | null;
  resume_size: number | null;
  cover_note: string | null;
  certificates: string[];
  profiles: ApplicantInfo | null;
}

interface JobWithApps extends Job {
  applications: AppItem[];
}

export function MyJobsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithApps[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingApp, setRejectingApp] = useState<AppItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const fetchJobs = async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        applications (
          id, applicant_id, applied_at, status, rejection_reason,
          resume_path, resume_name, resume_size, cover_note, certificates,
          profiles!applicant_id (id, full_name, profile_picture, education_level, field_of_study)
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

  const openResume = async (path: string) => {
    const { data } = await supabase.storage.from('resumes').createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAccept = async (appId: string) => {
    setBusyId(appId);
    const { error } = await supabase.rpc('accept_applicant', { p_application_id: appId });
    if (error) {
      console.error('Accept error:', error.message);
    }
    setBusyId(null);
    await fetchJobs();
  };

  const handleReject = async () => {
    if (!rejectingApp) return;
    if (!rejectReason.trim()) {
      setRejectError('Please provide a reason for rejection so the teacher can improve.');
      return;
    }
    setBusyId(rejectingApp.id);
    const { error } = await supabase.rpc('reject_applicant', {
      p_application_id: rejectingApp.id,
      p_reason: rejectReason.trim(),
    });
    if (error) {
      setRejectError(error.message || 'Could not reject application.');
    } else {
      setRejectingApp(null);
      setRejectReason('');
      setRejectError(null);
      await fetchJobs();
    }
    setBusyId(null);
  };

  const toggleJobActive = async (jobId: string, current: boolean) => {
    const { error } = await supabase.from('jobs').update({ is_active: !current }).eq('id', jobId);
    if (!error) fetchJobs();
  };

  if (loading) {
    return (
      <div>
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-4">
          <h1 className="text-lg font-bold text-gray-900">My Job Postings</h1>
          <p className="text-xs text-gray-500">Manage your listings and review applications</p>
        </div>
        <div className="px-5 py-4"><SkeletonList count={3} /></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-4">
        <h1 className="text-lg font-bold text-gray-900">My Job Postings</h1>
        <p className="text-xs text-gray-500">Review applications and select candidates</p>
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
            {jobs.map((job, idx) => {
              const apps = job.applications || [];
              const pending = apps.filter((a) => a.status === 'pending').length;
              const accepted = apps.filter((a) => a.status === 'accepted').length;
              const isExpanded = expandedJob === job.id;
              return (
                <div key={job.id} className="card animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
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
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="badge bg-gray-100 text-gray-600">{apps.length} {apps.length === 1 ? 'application' : 'applications'}</span>
                          {pending > 0 && <span className="badge bg-accent-100 text-accent-700">{pending} pending</span>}
                          {accepted > 0 && <span className="badge bg-success-100 text-success-700">{accepted} selected</span>}
                        </div>
                      </div>
                      <svg className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  </button>

                  <div className="mt-3 flex gap-2">
                    <button onClick={() => navigate(`/jobs/${job.id}`)} className="text-xs font-medium text-primary-600 hover:underline">View Details</button>
                    <span className="text-gray-200">|</span>
                    <button onClick={() => toggleJobActive(job.id, job.is_active)} className="text-xs font-medium text-gray-500 hover:underline">
                      {job.is_active ? 'Close Listing' : 'Reopen'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t border-gray-100 pt-4 space-y-3 animate-fade-in">
                      {apps.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-2">No applications yet.</p>
                      ) : (
                        apps.map((app) => {
                          const applicant = app.profiles;
                          return (
                            <div key={app.id} className="rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100/50">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 overflow-hidden">
                                  {applicant?.profile_picture ? (
                                    <img src={applicant.profile_picture} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    (applicant?.full_name?.[0]?.toUpperCase() || '?')
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{applicant?.full_name || 'Applicant'}</p>
                                  <p className="text-xs text-gray-400">
                                    {applicant?.education_level || ''} {applicant?.field_of_study ? `· ${applicant.field_of_study}` : ''}
                                  </p>
                                </div>
                                <StatusBadge status={app.status} />
                              </div>

                              {app.cover_note && <p className="mt-2 rounded-lg bg-white p-2 text-xs text-gray-600">{app.cover_note}</p>}

                              {app.certificates?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {app.certificates.map((cert, i) => (
                                    <span key={i} className="badge bg-primary-50 text-primary-600 text-[10px]">{cert}</span>
                                  ))}
                                </div>
                              )}

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {app.resume_path && (
                                  <button onClick={() => void openResume(app.resume_path as string)} className="text-xs font-medium text-primary-600 hover:underline">
                                    View resume
                                  </button>
                                )}

                                {app.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => void handleAccept(app.id)}
                                      disabled={busyId === app.id}
                                      className="flex-1 rounded-lg bg-success-500 py-2 text-xs font-semibold text-white hover:bg-success-600 disabled:opacity-50 transition-colors"
                                    >
                                      {busyId === app.id ? <Spinner size={14} /> : 'Select'}
                                    </button>
                                    <button
                                      onClick={() => { setRejectingApp(app); setRejectReason(''); setRejectError(null); }}
                                      disabled={busyId === app.id}
                                      className="flex-1 rounded-lg bg-error-50 py-2 text-xs font-semibold text-error-700 hover:bg-error-100 disabled:opacity-50 transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {app.status === 'rejected' && app.rejection_reason && (
                                  <p className="mt-1 w-full rounded-lg bg-error-50 p-2 text-xs text-error-600">
                                    Reason: {app.rejection_reason}
                                  </p>
                                )}

                                {app.status === 'accepted' && (
                                  <p className="mt-1 w-full text-xs text-success-600 font-medium">
                                    Selected — forwarded to admin for negotiation
                                  </p>
                                )}
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

      {rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setRejectingApp(null)}>
          <div className="w-full rounded-t-2xl bg-white p-5 pb-8 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Reject Application</h3>
              <button onClick={() => setRejectingApp(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>
            <p className="mb-3 text-sm text-gray-500">
              Please provide a reason for rejecting this application. The teacher will see this to help them improve and reapply.
            </p>
            <textarea
              className="input min-h-24 resize-none"
              placeholder="e.g. Needs more experience with classroom management"
              value={rejectReason}
              onChange={(e) => { setRejectReason(e.target.value); setRejectError(null); }}
            />
            {rejectError && <p className="mt-2 text-xs text-error-600">{rejectError}</p>}
            <button
              onClick={() => void handleReject()}
              disabled={busyId === rejectingApp.id}
              className="btn-primary mt-4 w-full bg-error-500 hover:bg-error-600"
            >
              {busyId === rejectingApp.id ? <Spinner size={18} /> : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      )}
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
    accepted: 'Selected',
    rejected: 'Rejected',
  };
  return <span className={`badge ${styles[status] || 'bg-gray-100 text-gray-600'}`}>{labels[status] || status}</span>;
}
