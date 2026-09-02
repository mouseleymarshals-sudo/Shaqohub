import { Link } from 'react-router-dom';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { box: 'h-8 w-8', text: 'text-lg', icon: 18 },
    md: { box: 'h-10 w-10', text: 'text-xl', icon: 22 },
    lg: { box: 'h-14 w-14', text: 'text-2xl', icon: 28 },
  };
  const s = sizes[size];

  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className={`${s.box} flex items-center justify-center rounded-xl bg-primary-600 shadow-sm shadow-primary-600/30`}>
        <svg width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
          <path d="M12 3L4 7v6l8 4 8-4V7l-8-4z" strokeLinejoin="round" />
          <path d="M4 7l8 4 8-4M12 11v6" strokeLinejoin="round" />
        </svg>
      </div>
      <span className={`${s.text} font-bold tracking-tight text-gray-900`}>
        Shaqo<span className="text-primary-600">Hub</span>
      </span>
    </Link>
  );
}
