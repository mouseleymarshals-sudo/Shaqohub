import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
    subjects: '',
    salary_amount: '',
    salary_currency: 'SOS',
    salary_period: 'month',
    location_district: '',
    location_village: '',
    location_city: 'Mogadishu',
    requirements: '',
    phone_number: '',
    application_deadline: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim()) {
      setError('Please enter a job title.');
      return;
    }
    setSaving(true);
    setError(null);

    const subjects = form.subjects.split(',').map((s) => s.trim()).filter(Boolean);
    const requirements = form.requirements.split('\n').map((r) => r.trim()).filter(Boolean);

    const { error } = await supabase.from('jobs').insert({
      posted_by: profile.id,
      institution_type: institutionType,
      title: form.title.trim(),
      description: form.description.trim(),
      teacher_type: form.teacher_type.trim() || null,
      subjects,
      salary_amount: form.salary_amount ? Number(form.salary_amount) : null,
      salary_currency: form.salary_amount ? form.salary_currency : null,
      salary_period: form.salary_amount ? form.salary_period : null,
      location_district: form.location_district.trim() || null,
      location_village: form.location_village.trim() || null,
      location_city: form.location_city.trim() || null,
      requirements,
      phone_number: form.phone_number.trim() || null,
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

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

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
            <input className="input" placeholder="e.g. Mathematics Teacher for Grade 8" value={form.title} onChange={(e) => update('title', e.target.value)} />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[100px] resize-none" placeholder="Describe the role, responsibilities, and what you're looking for..." value={form.description} onChange={(e) => update('description', e.target.value)} />
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

          <div>
            <label className="label">Subjects (comma-separated)</label>
            <input className="input" placeholder="e.g. Math, Science, English" value={form.subjects} onChange={(e) => update('subjects', e.target.value)} />
          </div>

          <div>
            <label className="label">Salary</label>
            <div className="flex gap-2">
              <input className="input flex-1" type="number" placeholder="Amount" value={form.salary_amount} onChange={(e) => update('salary_amount', e.target.value)} />
              <select className="input w-24" value={form.salary_currency} onChange={(e) => update('salary_currency', e.target.value)}>
                <option value="SOS">SOS</option>
                <option value="USD">USD</option>
              </select>
              <select className="input w-24" value={form.salary_period} onChange={(e) => update('salary_period', e.target.value)}>
                <option value="month">/mo</option>
                <option value="year">/yr</option>
                <option value="hour">/hr</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" placeholder="Mogadishu" value={form.location_city} onChange={(e) => update('location_city', e.target.value)} />
            </div>
            <div>
              <label className="label">District</label>
              <input className="input" placeholder="e.g. Banadir" value={form.location_district} onChange={(e) => update('location_district', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Requirements (one per line)</label>
            <textarea className="input min-h-[80px] resize-none" placeholder={"e.g. Bachelor's degree in Education\n2+ years teaching experience\nFluent in English"} value={form.requirements} onChange={(e) => update('requirements', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone Number</label>
              <input className="input" placeholder="e.g. +252 6 1234567" value={form.phone_number} onChange={(e) => update('phone_number', e.target.value)} />
            </div>
            <div>
              <label className="label">Deadline</label>
              <input className="input" type="date" value={form.application_deadline} onChange={(e) => update('application_deadline', e.target.value)} />
            </div>
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
