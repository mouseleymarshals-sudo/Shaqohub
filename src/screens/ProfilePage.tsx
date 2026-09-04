import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Feedback';
import { SectorIcon } from '../components/Icons';
import type { Profile, UserRole } from '../lib/supabase';

const isTeacher = (role: string | null) => role === 'school_teacher' || role === 'university_lecturer';

export function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        education_level: profile.education_level || '',
        field_of_study: profile.field_of_study || '',
        graduation_year: String(profile.graduation_year || ''),
        academic_title: profile.academic_title || '',
        department: profile.department || '',
        research_fields: (profile.research_fields || []).join(', '),
        institution_name: profile.institution_name || '',
        city: profile.city || '',
        district: profile.district || '',
        neighborhood: profile.neighborhood || '',
        school_type: profile.school_type || '',
        number_of_branches: String(profile.number_of_branches || ''),
        phone_number: profile.phone_number || '',
      });
    }
  }, [profile]);

  if (!profile) {
    return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  }

  const teacher = isTeacher(profile.role);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const updates: Record<string, unknown> = {};
    if (teacher) {
      updates.full_name = form.full_name || null;
      updates.education_level = form.education_level || null;
      updates.field_of_study = form.field_of_study || null;
      updates.graduation_year = form.graduation_year ? parseInt(form.graduation_year) : null;
      updates.academic_title = form.academic_title || null;
      updates.department = form.department || null;
      updates.research_fields = form.research_fields ? form.research_fields.split(',').map((s) => s.trim()).filter(Boolean) : [];
      updates.phone_number = form.phone_number || null;
    } else {
      updates.institution_name = form.institution_name || null;
      updates.city = form.city || null;
      updates.district = form.district || null;
      updates.neighborhood = form.neighborhood || null;
      updates.school_type = form.school_type || null;
      updates.number_of_branches = form.number_of_branches ? parseInt(form.number_of_branches) : null;
      updates.phone_number = form.phone_number || null;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
    setSaving(false);
    if (error) {
      setError('Failed to save profile. Please try again.');
    } else {
      await refreshProfile();
      setEditing(false);
    }
  };

  const roleLabel: Record<UserRole, string> = {
    school_teacher: 'School Teacher',
    university_lecturer: 'University Lecturer',
    school: 'School',
    university: 'University',
  };

  const displayName = profile.full_name || profile.institution_name || 'New User';
  const avatarLetter = (displayName)[0]?.toUpperCase();

  return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-5 pt-10 pb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-8" />

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-bold">My Profile</h1>
            <button onClick={async () => { await signOut(); navigate('/auth'); }} className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Sign Out
            </button>
          </div>

          <div className="flex items-center gap-4">
            {profile.profile_picture ? (
              <img src={profile.profile_picture} alt={displayName} className="h-20 w-20 rounded-full object-cover ring-4 ring-white/20" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-3xl font-bold backdrop-blur-sm ring-4 ring-white/10">
                {avatarLetter}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{displayName}</h2>
              <p className="text-sm text-white/70">{profile.email}</p>
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                <span className="text-white"><SectorIcon type={profile.role} size={14} /></span>
                {roleLabel[profile.role]}
              </span>
            </div>
          </div>

          {profile.subscription_active ? (
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2.5 text-sm backdrop-blur-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth={2}><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" strokeLinejoin="round" /></svg>
              <span className="font-medium">Premium {profile.subscription_plan} plan</span>
              {profile.subscription_end_date && (
                <span className="text-white/60 text-xs">until {new Date(profile.subscription_end_date).toLocaleDateString()}</span>
              )}
            </div>
          ) : (
            <button onClick={() => navigate('/subscription')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition-colors shadow-md shadow-accent-500/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" strokeLinejoin="round" /></svg>
              Upgrade to Premium
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">{teacher ? 'Professional Info' : 'Institution Info'}</h3>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-sm font-medium text-primary-600 hover:underline">Edit</button>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => { setEditing(false); setError(null); }} className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {error && <div className="mb-3 rounded-lg bg-error-50 border border-error-100 px-4 py-2.5 text-sm text-error-700 animate-fade-in">{error}</div>}

        {editing ? (
          <EditForm form={form} setForm={setForm} teacher={teacher} />
        ) : (
          <ViewInfo profile={profile as unknown as Profile} teacher={teacher} />
        )}
      </div>
    </div>
  );
}

function ViewInfo({ profile, teacher }: { profile: Profile; teacher: boolean }) {
  const fields: { label: string; value: string | null }[] = teacher
    ? [
        { label: 'Full Name', value: profile.full_name },
        { label: 'Education Level', value: profile.education_level },
        { label: 'Field of Study', value: profile.field_of_study },
        { label: 'Graduation Year', value: profile.graduation_year ? String(profile.graduation_year) : null },
        { label: 'Academic Title', value: profile.academic_title },
        { label: 'Department', value: profile.department },
        { label: 'Research Fields', value: Array.isArray(profile.research_fields) ? profile.research_fields.join(', ') : null },
        { label: 'Phone Number', value: profile.phone_number },
      ]
    : [
        { label: 'Institution Name', value: profile.institution_name },
        { label: 'City', value: profile.city },
        { label: 'District', value: profile.district },
        { label: 'Neighborhood', value: profile.neighborhood },
        { label: 'School Type', value: profile.school_type },
        { label: 'Number of Branches', value: profile.number_of_branches ? String(profile.number_of_branches) : null },
        { label: 'Phone Number', value: profile.phone_number },
      ];

  return (
    <div className="space-y-1">
      {fields.map((f) => (
        <div key={f.label} className="flex items-center justify-between border-b border-gray-50 py-3">
          <span className="text-sm text-gray-400">{f.label}</span>
          <span className={`text-sm font-medium text-right ${f.value ? 'text-gray-900' : 'text-gray-300'}`}>{f.value || 'Not set'}</span>
        </div>
      ))}
    </div>
  );
}

function EditForm({ form, setForm, teacher }: { form: Record<string, string>; setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>; teacher: boolean }) {
  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  if (teacher) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Field label="Full Name"><input className="input" value={form.full_name || ''} onChange={(e) => update('full_name', e.target.value)} placeholder="Your full name" /></Field>
        <Field label="Education Level">
          <select className="input" value={form.education_level || ''} onChange={(e) => update('education_level', e.target.value)}>
            <option value="">Select...</option>
            <option value="High School">High School</option>
            <option value="Diploma">Diploma</option>
            <option value="Bachelor's">Bachelor's</option>
            <option value="Master's">Master's</option>
            <option value="PhD">PhD</option>
          </select>
        </Field>
        <Field label="Field of Study"><input className="input" value={form.field_of_study || ''} onChange={(e) => update('field_of_study', e.target.value)} placeholder="e.g. Mathematics" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Graduation Year"><input className="input" type="number" value={form.graduation_year || ''} onChange={(e) => update('graduation_year', e.target.value)} placeholder="2024" /></Field>
          <Field label="Phone Number"><input className="input" value={form.phone_number || ''} onChange={(e) => update('phone_number', e.target.value)} placeholder="+252..." /></Field>
        </div>
        <Field label="Academic Title"><input className="input" value={form.academic_title || ''} onChange={(e) => update('academic_title', e.target.value)} placeholder="e.g. Professor" /></Field>
        <Field label="Department"><input className="input" value={form.department || ''} onChange={(e) => update('department', e.target.value)} placeholder="e.g. Computer Science" /></Field>
        <Field label="Research Fields (comma-separated)"><input className="input" value={form.research_fields || ''} onChange={(e) => update('research_fields', e.target.value)} placeholder="AI, Machine Learning" /></Field>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Field label="Institution Name"><input className="input" value={form.institution_name || ''} onChange={(e) => update('institution_name', e.target.value)} placeholder="e.g. Mogadishu University" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City"><input className="input" value={form.city || ''} onChange={(e) => update('city', e.target.value)} placeholder="Mogadishu" /></Field>
        <Field label="District"><input className="input" value={form.district || ''} onChange={(e) => update('district', e.target.value)} placeholder="e.g. Banadir" /></Field>
      </div>
      <Field label="Neighborhood"><input className="input" value={form.neighborhood || ''} onChange={(e) => update('neighborhood', e.target.value)} placeholder="e.g. Hodan" /></Field>
      <Field label="School Type">
        <select className="input" value={form.school_type || ''} onChange={(e) => update('school_type', e.target.value)}>
          <option value="">Select...</option>
          <option value="Primary">Primary</option>
          <option value="Secondary">Secondary</option>
          <option value="Both">Primary & Secondary</option>
          <option value="International">International</option>
          <option value="Quranic">Quranic School</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Branches"><input className="input" type="number" value={form.number_of_branches || ''} onChange={(e) => update('number_of_branches', e.target.value)} placeholder="1" /></Field>
        <Field label="Phone Number"><input className="input" value={form.phone_number || ''} onChange={(e) => update('phone_number', e.target.value)} placeholder="+252..." /></Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
