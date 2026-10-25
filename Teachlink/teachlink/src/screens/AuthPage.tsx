import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Spinner } from '../components/Feedback';
import { supabase, type UserRole } from '../lib/supabase';

const roleOptions: { value: UserRole; label: string; desc: string; image: string }[] = [
  { value: 'school_teacher', label: 'School Teacher', desc: 'Primary & secondary educator', image: 'https://images.pexels.com/photos/35610368/pexels-photo-35610368.jpeg?auto=compress&cs=tinysrgb&h=400&w=600' },
  { value: 'university_lecturer', label: 'University Lecturer', desc: 'Higher education staff', image: 'https://images.pexels.com/photos/7092613/pexels-photo-7092613.jpeg?auto=compress&cs=tinysrgb&h=400&w=600' },
  { value: 'school', label: 'School', desc: 'Primary or secondary school', image: 'https://images.pexels.com/photos/35250413/pexels-photo-35250413.jpeg?auto=compress&cs=tinysrgb&h=400&w=600' },
  { value: 'university', label: 'University', desc: 'Higher education institution', image: 'https://images.pexels.com/photos/16086326/pexels-photo-16086326.jpeg?auto=compress&cs=tinysrgb&h=400&w=600' },
];

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function RoleCard({ opt, selected, onSelect }: {
  opt: typeof roleOptions[0];
  selected: boolean;
  onSelect: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 ${
        selected
          ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="relative h-24 w-full overflow-hidden bg-gray-100">
        {!loaded && <div className="shimmer absolute inset-0" />}
        <img
          src={opt.image}
          alt={opt.label}
          className={`h-full w-full object-cover transition-all duration-500 ${
            loaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0'
          }`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        {selected && (
          <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg animate-bounce-in">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-3 bg-white">
        <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
        <span className="text-[11px] text-gray-500 leading-tight">{opt.desc}</span>
      </div>
    </button>
  );
}

export function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('school_teacher');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error === 'Invalid login credentials' ? 'Wrong email or password.' : error);
    } else {
      const { error } = await signUp(email, password, role);
      if (error) setError(error);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await signInWithGoogle(mode === 'signup' ? role : undefined);
    if (error) {
      setError(error);
      setGoogleLoading(false);
    }
    // If no error, the browser will redirect to Google — no need to reset loading
  };

  // Detect OAuth redirect: if URL has hash fragments from Supabase, show a transitional state
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('error'))) {
      setGoogleLoading(true);
    }
  }, []);

  // Fetch registered institutions and their logos
  const [institutions, setInstitutions] = useState<{ institution_name: string; logo: string | null; role: string; profile_picture: string | null }[]>([]);
  useEffect(() => {
    supabase
      .from('profiles')
      .select('institution_name, logo, role, profile_picture')
      .in('role', ['school', 'university'])
      .not('institution_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setInstitutions(data || []));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white flex flex-col">
      <div className="mx-auto max-w-md w-full flex-1 flex flex-col px-6 py-10">
        <div className="flex flex-col items-center mt-6 mb-8">
          <Logo size="lg" />
          <p className="mt-3 text-center text-sm text-gray-500 max-w-xs">
            Connecting teachers and schools across Mogadishu
          </p>
        </div>

        <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
          <button
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
              mode === 'login' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
              mode === 'signup' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50 mb-4"
        >
          {googleLoading ? <Spinner size={18} /> : <GoogleIcon />}
          {mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'signup' && role.startsWith('school_teacher') || (mode === 'signup' && role.startsWith('university_lecturer')) ? (
            <div className="animate-fade-in">
              <label className="label">Registered Institutions</label>
              <p className="mb-3 text-xs text-gray-500">These schools and universities have already joined TeachLink:</p>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-200 p-3">
                {institutions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Loading institutions...</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {institutions.map((inst, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1.5">
                        {inst.logo || inst.profile_picture ? (
                          <img src={inst.logo || inst.profile_picture || ''} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
                            {inst.institution_name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-xs font-medium text-gray-600">{inst.institution_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {mode === 'signup' && (
            <div className="animate-fade-in">
              <label className="label">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                {roleOptions.map((opt) => (
                  <RoleCard
                    key={opt.value}
                    opt={opt}
                    selected={role === opt.value}
                    onSelect={() => setRole(opt.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-700 animate-fade-in">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner size={18} /> : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          By continuing you agree to TeachLink's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
