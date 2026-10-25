import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, Profile, UserRole } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

const PENDING_ROLE_KEY = 'teachlink_pending_role';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, role: UserRole) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (role?: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Profile fetch error:', error.message);
      return null;
    }
    return data as Profile | null;
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      const p = await fetchProfile(session.user.id);
      setProfile(p);
    }
  };

  useEffect(() => {
    // Check for OAuth redirect callback first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        fetchProfile(session.user.id).then((p) => {
          setProfile(p);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user?.id) {
        (async () => {
          let p = await fetchProfile(session.user.id);

          if (!p) {
            // The database trigger should have already created the profile.
            // But if it hasn't propagated yet, retry after a short delay.
            await new Promise((resolve) => setTimeout(resolve, 500));
            p = await fetchProfile(session.user.id);
          }

          if (!p) {
            // Still no profile — create one manually as a fallback.
            const pendingRole = localStorage.getItem(PENDING_ROLE_KEY) as UserRole | null;
            const role = pendingRole || 'school_teacher';
            if (pendingRole) localStorage.removeItem(PENDING_ROLE_KEY);

            await supabase.from('profiles').insert({
              id: session.user.id,
              email: session.user.email || '',
              role,
              full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
              profile_picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
            });

            await supabase.from('notifications').insert({
              user_id: session.user.id,
              type: 'welcome',
              title: 'Welcome to TeachLink!',
              body: 'Complete your profile to get the best matches and start applying to jobs.',
            });

            p = await fetchProfile(session.user.id);
          } else if (p.role === 'school_teacher') {
            // Profile exists from trigger with default role — update if user selected a role
            const pendingRole = localStorage.getItem(PENDING_ROLE_KEY) as UserRole | null;
            if (pendingRole) {
              localStorage.removeItem(PENDING_ROLE_KEY);
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ role: pendingRole })
                .eq('id', session.user.id);
              if (!updateError) {
                p = await fetchProfile(session.user.id);
              }
            }
          }

          setProfile(p);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
      },
    });
    if (error) return { error: error.message };

    // The trigger will create the profile automatically, but for email signup
    // we also create it here to be safe (the trigger handles OAuth users).
    if (data.user) {
      // Check if profile already exists (trigger may have created it)
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!existing) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          role,
        });
        if (profileError) return { error: profileError.message };
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signInWithGoogle = async (role?: UserRole) => {
    if (role) {
      localStorage.setItem(PENDING_ROLE_KEY, role);
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: role ? { role } : undefined,
      },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('provider') || msg.includes('not enabled') || msg.includes('oauth')) {
        return {
          error: 'Google sign-in is not yet configured. Please use email/password for now, or enable Google in your Supabase Authentication settings.',
        };
      }
      return { error: error.message };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signUp, signIn, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
