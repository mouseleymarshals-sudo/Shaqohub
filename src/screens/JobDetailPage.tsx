import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Job } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { EmptyState, SkeletonDetail } from '../components/Feedback';
import { SectorIcon, InfoIcon, type InfoIconName } from '../components/Icons';

const isTeacher = (role: string | null) => role === 'school_teacher' || role === 'university_lecturer';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          profiles!posted_by (institution_name, logo, phone_number, city, district)
        `)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('Error fetching job:', error.message);
      } else {
        setJob(data as unknown as Job);
      }
      setLoading(false);
    })();

    if (profile && isTeacher(profile.role)) {
      (async () => {
        const { data } = await supabase
          .from('applications')
          .select('id')
          .eq('job_id', id)
          .eq('applicant_id', profile.id)
          .maybeSingle();
        if (data) setApplied(true);
      })();
    }
  }, [id, profile]);

  const handleApply = async () => {
    if (!profile || !id) return;
    setApplying(true);
    setError(null);
    const { error } = await supabase.from('applications').insert({
      job_id: id,
      applicant_id: profile.id,
    });
    if (error) {
      setError('Failed to apply. Please try again.');
    } else {
      setApplied(true);
    }
    setApplying(false);
  };

  if (loading) {
    return (
      <div>
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
        </div>
        <SkeletonDetail />
      </div>
    );
  }

  if (!job) {
    return (
      <EmptyState
        icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 7l9-4 9 4M5 10v8a2 2 0 002 2h10a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        title="Job not found"
        message="This job may have been removed or is no longer active."
      />
    );
  }

  const teacher = profile ? isTeacher(profile.role) : false;
  const isOwner = profile?.id === job.posted_by;

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-start gap-4 mb-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
            <SectorIcon type={job.institution_type} size={32} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-sm text-gray-500">{job.profiles?.institution_name || 'Unknown institution'}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="badge bg-primary-50 text-primary-700 capitalize">{job.institution_type}</span>
              {job.teacher_type && <span className="badge bg-gray-100 text-gray-600">{job.teacher_type}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {job.location_city && (
            <InfoCard icon="location" label="Location" value={`${job.location_city}${job.location_district ? ', ' + job.location_district : ''}`} />
          )}
          {job.salary_amount && (
            <InfoCard icon="salary" label="Salary" value={`${Number(job.salary_amount).toLocaleString()} ${job.salary_currency || ''}/${job.salary_period || ''}`} />
          )}
          {job.application_deadline && (
            <InfoCard icon="calendar" label="Deadline" value={new Date(job.application_deadline).toLocaleDateString()} />
          )}
          {job.phone_number && (
            <InfoCard icon="phone" label="Contact" value={job.phone_number} />
          )}
        </div>

        {job.subjects?.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Subjects</h2>
            <div className="flex flex-wrap gap-2">
              {job.subjects.map((s, i) => (
                <span key={i} className="badge bg-primary-50 text-primary-700 px-3 py-1.5 text-sm">{s}</span>
              ))}
            </div>
          </div>
        )}

        {job.description && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </div>
        )}

        {job.requirements?.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Requirements</h2>
            <ul className="space-y-2">
              {job.requirements.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="mt-0.5 shrink-0 text-primary-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {teacher && !isOwner && (
          <div className="sticky bottom-24 -mx-5 px-5 py-3 bg-gradient-to-t from-white via-white to-transparent">
            {applied ? (
              <div className="btn w-full bg-success-500 text-white cursor-default animate-bounce-in">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}><path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Application Submitted
              </div>
            ) : (
              <button onClick={handleApply} disabled={applying} className="btn-primary w-full">
                {applying ? (
                  <>
                    <div className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Applying...
                  </>
                ) : 'Apply Now'}
              </button>
            )}
            {error && <p className="mt-2 text-center text-sm text-error-600">{error}</p>}
          </div>
        )}

        {isOwner && (
          <div className="mt-6 flex gap-3">
            <button onClick={() => navigate('/my-jobs')} className="btn-secondary flex-1">
              Manage Applications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: InfoIconName; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-1">
        <InfoIcon name={icon} size={14} /> {label}
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
