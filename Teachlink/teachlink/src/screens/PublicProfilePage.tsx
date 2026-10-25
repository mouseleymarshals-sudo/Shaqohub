import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { Spinner } from '../components/Feedback';
import { SectorIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

const isTeacher = (role: string | null) => role === 'school_teacher' || role === 'university_lecturer';

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) supabase.from('profiles').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      setProfile(data as Profile | null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  if (!profile) return <div className="p-8 text-center text-sm text-gray-500">Profile not found.</div>;

  const name = profile.full_name || profile.institution_name || 'TeachLink member';
  const viewerIsTeacher = currentUser ? isTeacher(currentUser.role) : false;
  const profileIsInstitution = !isTeacher(profile.role);

  const teacherFields: [string, string | null][] = [
    ['Education', profile.education_level],
    ['Field', profile.field_of_study],
    ['Title', profile.academic_title],
    ['Department', profile.department],
  ];

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Public profile</h1>
      </div>

      <div className="px-5 py-6">
        <div className="flex items-center gap-4">
          {profile.profile_picture ? (
            <img src={profile.profile_picture} alt={name} className="h-20 w-20 rounded-full object-cover ring-4 ring-primary-50" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
              {name[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{name}</h2>
            <div className="mt-1 flex items-center gap-1.5">
              <SectorIcon type={profile.role} size={14} />
              <span className="text-sm text-gray-500 capitalize">{profile.role.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-1">
          {profileIsInstitution && viewerIsTeacher ? (
            <div className="rounded-lg bg-accent-50 border border-accent-100 px-4 py-3 text-sm text-accent-700">
              Institution details are private. Contact information is shared only when you are selected for a position.
            </div>
          ) : (
            teacherFields
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-gray-100 py-3 text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))
          )}
        </div>

        {profile.research_fields?.length ? (
          <div className="mt-5">
            <p className="text-sm font-semibold text-gray-900">Research fields</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.research_fields.map((field) => (
                <span key={field} className="badge bg-primary-50 text-primary-700">{field}</span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
