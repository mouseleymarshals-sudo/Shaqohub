import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, CITIES } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function PostJobPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const institutionType = profile?.role === 'university' ? 'university' : 'school';

  const [form, setForm] = useState({
    title: '',
    description: '',
    teacher_type: '',
    position_count: '1',
    primary_subjects: '',
    secondary_subjects: '',
    salary_amount: '',
    salary_currency: 'USD',
    salary_period: 'month',
    salary_negotiable: false,
    location_city: 'Mogadishu city',
    location_district: '',
    location_village: '',
    requirements: '',
    application_deadline: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim()) {
      setError('Please enter a job title.');
      return;
    }
    if (parseInt(form.position_count) < 1) {
      setError('Position count must be at least 1.');
      return;
    }
    setSaving(true);
    setError(null);

    const primarySubjects = form.primary_subjects.split(',').map((s) => s.trim()).filter(Boolean);
    const secondarySubjects = form.secondary_subjects.split(',').map((s) => s.trim()).filter(Boolean);
    const requirements = form.requirements.split('\n').map((r) => r.trim()).filter(Boolean);

    const { error } = await supabase.from('jobs').insert({
      posted_by: profile.id,
      institution_type: institutionType,
      title: form.title.trim(),
      description: form.description.trim(),
      teacher_type: form.teacher_type.trim() || null,
      position_count: parseInt(form.position_count) || 1,
      primary_subjects: primarySubjects,
      secondary_subjects: secondarySubjects,
      subjects: [...primarySubjects, ...secondarySubjects],
      salary_amount: form.salary_negotiable ? null : (form.salary_amount ? Number(form.salary_amount) : null),
      salary_currency: form.salary_negotiable ? null : (form.salary_amount ? form.salary_currency : null),
      salary_period: form.salary_negotiable ? null : (form.salary_amount ? form.salary_period : null),
      salary_negotiable: form.salary_negotiable,
      location_district: form.location_district.trim() || null,
      location_village: form.location_village.trim() || null,
      location_city: form.location_city.trim() || null,
      requirements,
      application_deadline: form.application_deadline || null,
      is_active: true,
    });

    setSaving(false);
    if (error) {
      setError('Failed to post job. Please try again.');
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/my-jobs'), 1200);
    }
  };

  const update = (key: string, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors mb-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
        <h1 className="text-lg font-bold text-gray-900">Post a Job</h1>
        <p className="text-xs text-gray-500">Fill in the details to find the right teacher</p>
      </div>

      {success ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-bounce-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-100 mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5}><path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Job Posted!</h2>
          <p className="mt-2 text-sm text-gray-500">Redirecting to your job postings...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
          <div>
            <label className="label">Job Title *</label>
            <input className="input" placeholder="e.g. 2 Teachers for Mathematics and English" value={form.title} onChange={(e) => update('title', e.target.value)} />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[100px] resize-none" placeholder="Describe the role, responsibilities, and what you're looking for..." value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Positions Available *</label>
              <input className="input" type="number" min="1" value={form.position_count} onChange={(e) => update('position_count', e.target.value)} />
            </div>
            <div>
              <label className="label">Teacher Type</label>
              <select className="input" value={form.teacher_type} onChange={(e) => update('teacher_type', e.target.value)}>
                <option value="">Select type...</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Substitute">Substitute</option>
                <option value="Volunteer">Volunteer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Primary Subjects (comma-separated)</label>
            <input className="input" placeholder="e.g. Mathematics, English" value={form.primary_subjects} onChange={(e) => update('primary_subjects', e.target.value)} />
          </div>

          <div>
            <label className="label">Secondary Subjects (comma-separated)</label>
            <input className="input" placeholder="e.g. Biology, Chemistry" value={form.secondary_subjects} onChange={(e) => update('secondary_subjects', e.target.value)} />
          </div>

          <div>
            <label className="label">Salary</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                <input type="checkbox" checked={form.salary_negotiable} onChange={(e) => update('salary_negotiable', e.target.checked)} className="h-4 w-4 rounded text-primary-600" />
                <span className="text-sm font-medium text-gray-700">Salary is negotiable</span>
              </label>
              {!form.salary_negotiable && (
                <div className="flex gap-2 animate-fade-in">
                  <input className="input flex-1" type="number" placeholder="Amount" value={form.salary_amount} onChange={(e) => update('salary_amount', e.target.value)} />
                  <select className="input w-24" value={form.salary_currency} onChange={(e) => update('salary_currency', e.target.value)}>
                    <option value="USD">USD</option>
                    <option value="SOS">SOS</option>
                  </select>
                  <select className="input w-24" value={form.salary_period} onChange={(e) => update('salary_period', e.target.value)}>
                    <option value="month">/mo</option>
                    <option value="year">/yr</option>
                    <option value="hour">/hr</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Location</label>
              <select className="input" value={form.location_city} onChange={(e) => update('location_city', e.target.value)}>
                {CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">District / Village</label>
              <input className="input" placeholder="e.g. Oodweyne" value={form.location_village} onChange={(e) => update('location_village', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Requirements (one per line)</label>
            <textarea className="input min-h-[80px] resize-none" placeholder={"e.g. Bachelor's degree in Education\n2+ years teaching experience\nFluent in English"} value={form.requirements} onChange={(e) => update('requirements', e.target.value)} />
          </div>

          <div>
            <label className="label">Application Deadline</label>
            <input className="input" type="date" value={form.application_deadline} onChange={(e) => update('application_deadline', e.target.value)} />
          </div>

          {error && (
            <div className="rounded-lg bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-700 animate-fade-in">{error}</div>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? (
              <>
                <div className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Posting...
              </>
            ) : 'Post Job'}
          </button>
        </form>
      )}
    </div>
  );
}
