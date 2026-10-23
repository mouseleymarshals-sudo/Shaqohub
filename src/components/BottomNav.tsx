import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const isTeacher = (role: string | null) => role === 'school_teacher' || role === 'university_lecturer';

export function BottomNav() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('notifications-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => {
        (async () => {
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('is_read', false);
          setUnreadCount(count || 0);
        })();
      })
      .subscribe();

    (async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    })();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  if (!profile) return null;

  const teacher = isTeacher(profile.role);

  const items = teacher
    ? [
        { path: '/jobs', label: 'Jobs', icon: JobIcon },
        { path: '/saved', label: 'Saved', icon: SavedIcon },
        { path: '/applications', label: 'Applied', icon: AppliedIcon },
        { path: '/notifications', label: 'Alerts', icon: BellIcon, badge: unreadCount },
        { path: '/profile', label: 'Profile', icon: ProfileIcon },
      ]
    : [
        { path: '/dashboard', label: 'Home', icon: HomeIcon },
        { path: '/my-jobs', label: 'My Posts', icon: BriefcaseIcon },
        { path: '/post-job', label: 'Post', icon: PlusIcon, highlight: true },
        { path: '/notifications', label: 'Alerts', icon: BellIcon, badge: unreadCount },
        { path: '/profile', label: 'Profile', icon: ProfileIcon },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const active = location.pathname === item.path || (item.path === '/jobs' && location.pathname === '/') || (item.path === '/dashboard' && location.pathname === '/');
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`group relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors duration-200 ${
                active ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-primary-600 transition-all duration-200" />
              )}
              <div className="relative">
                <Icon active={active} highlight={item.highlight} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[9px] font-bold text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] font-medium transition-all duration-200 ${active ? 'text-primary-600' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

type IconProps = { active: boolean; highlight?: boolean };

const JobIcon = ({ active }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className={`transition-all duration-200 ${active ? 'scale-110' : ''}`}>
    <path d="M3 7l9-4 9 4M5 10v8a2 2 0 002 2h10a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 20v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SavedIcon = ({ active }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className={`transition-all duration-200 ${active ? 'scale-110' : ''}`}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AppliedIcon = ({ active }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className={`transition-all duration-200 ${active ? 'scale-110' : ''}`}>
    <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ProfileIcon = ({ active }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className={`transition-all duration-200 ${active ? 'scale-110' : ''}`}>
    <circle cx="12" cy="8" r="4" strokeLinecap="round" />
    <path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BriefcaseIcon = ({ active }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className={`transition-all duration-200 ${active ? 'scale-110' : ''}`}>
    <rect x="2" y="7" width="20" height="14" rx="2" strokeLinecap="round" />
    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" />
  </svg>
);

const PlusIcon = ({ highlight }: IconProps) => (
  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${highlight ? 'bg-primary-600 shadow-md shadow-primary-600/30' : ''} transition-all duration-200 group-hover:scale-105`}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={highlight ? '#fff' : 'currentColor'} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  </div>
);

const HomeIcon = ({ active }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className={`transition-all duration-200 ${active ? 'scale-110' : ''}`}>
    <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BellIcon = ({ active }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className={`transition-all duration-200 ${active ? 'scale-110' : ''}`}>
    <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
