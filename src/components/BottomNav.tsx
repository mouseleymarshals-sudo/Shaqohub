import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const isTeacher = (role: string | null) => role === 'school_teacher' || role === 'university_lecturer';

export function BottomNav() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!profile) return null;

  const teacher = isTeacher(profile.role);

  const items = teacher
    ? [
        { path: '/jobs', label: 'Jobs', icon: JobIcon },
        { path: '/applications', label: 'Applied', icon: AppliedIcon },
        { path: '/profile', label: 'Profile', icon: ProfileIcon },
      ]
    : [
        { path: '/jobs', label: 'Browse', icon: JobIcon },
        { path: '/my-jobs', label: 'My Posts', icon: BriefcaseIcon },
        { path: '/post-job', label: 'Post', icon: PlusIcon, highlight: true },
        { path: '/profile', label: 'Profile', icon: ProfileIcon },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const active = location.pathname === item.path || (item.path === '/jobs' && location.pathname === '/');
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                active ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              <Icon active={active} highlight={item.highlight} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

type IconProps = { active: boolean; highlight?: boolean };

const JobIcon = ({ active }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
    <path d="M3 7l9-4 9 4M5 10v8a2 2 0 002 2h10a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 20v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AppliedIcon = ({ active }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
    <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ProfileIcon = ({ active }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
    <circle cx="12" cy="8" r="4" strokeLinecap="round" />
    <path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BriefcaseIcon = ({ active }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
    <rect x="2" y="7" width="20" height="14" rx="2" strokeLinecap="round" />
    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" />
  </svg>
);

const PlusIcon = ({ highlight }: IconProps) => (
  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${highlight ? 'bg-primary-600' : ''} transition-transform`}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={highlight ? '#fff' : 'currentColor'} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  </div>
);
