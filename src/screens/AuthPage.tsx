import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Spinner } from '../components/Feedback';
import type { UserRole } from '../lib/supabase';

const roleOptions: { value: UserRole; label: string; desc: string; image: string }[] = [
  { value: 'school_teacher', label: 'School Teacher', desc: 'Primary & secondary educator', image: 'https://images.pexels.com/photos/35610368/pexels-photo-35610368.jpeg?auto=compress&cs=tinysrgb&h=400&w=600' },
  { value: 'university_lecturer', label: 'University Lecturer', desc: 'Higher education staff', image: 'https://images.pexels.com/photos/7092613/pexels-photo-7092613.jpeg?auto=compress&cs=tinysrgb&h=400&w=600' },
  { value: 'school', label: 'School', desc: 'Primary or secondary school', image: 'https://images.pexels.com/photos/35250413/pexels-photo-35250413.jpeg?auto=compress&cs=tinysrgb&h=400&w=600' },
  { value: 'university', label: 'University', desc: 'Higher education institution', image: 'https://images.pexels.com/photos/16086326/pexels-photo-16086326.jpeg?auto=compress&cs=tinysrgb&h=400&w=600' },
];

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
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('school_teacher');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
