import { ReactNode } from 'react';

type IconProps = { className?: string; size?: number };

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
});

/* ── Sector / role icons ────────────────────────────────────── */

export function SchoolTeacherIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" />
      <path d="M8 5v16M4 9h4M4 13h4M4 17h4" />
      <path d="M18 9h2a2 2 0 012 2v2a2 2 0 01-2 2h-2" />
    </svg>
  );
}

export function LecturerIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2 9l10-5 10 5-10 5L2 9z" />
      <path d="M6 11v4c0 1.5 2.5 3 6 3s6-1.5 6-3v-4" />
      <path d="M22 9v5" />
    </svg>
  );
}

export function SchoolIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 21h18M4 21V8l8-5 8 5v13" />
      <path d="M9 21v-5a3 3 0 016 0v5" />
      <path d="M9 12h.01M15 12h.01" />
    </svg>
  );
}

export function UniversityIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2 9l10-5 10 5-10 5L2 9z" />
      <path d="M5 11v6M19 11v6M3 21h18M9 21v-4h6v4" />
      <path d="M12 4v2" />
    </svg>
  );
}

const sectorMap: Record<string, (p: IconProps) => ReactNode> = {
  school_teacher: SchoolTeacherIcon,
  university_lecturer: LecturerIcon,
  school: SchoolIcon,
  university: UniversityIcon,
};

export function SectorIcon({ type, ...props }: IconProps & { type: string }) {
  const Cmp = sectorMap[type] ?? SchoolIcon;
  return <Cmp {...props} />;
}

/* ── Utility icons (location, salary, deadline, phone) ─────── */

export function LocationIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export function SalaryIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 10h4.5a2 2 0 010 4H9.5" />
    </svg>
  );
}

export function CalendarIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
      <path d="M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}

export function PhoneIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M22 16.5v2a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 2.2 2 2 0 014.1 0h2a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.5 2.1L7.1 7.8a16 16 0 006 6l1.3-1.1a2 2 0 012.1-.5c.9.3 1.8.5 2.7.6a2 2 0 011.8 2z" />
    </svg>
  );
}

export function StarIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-5" />
    </svg>
  );
}

/* ── Info card icon wrapper ─────────────────────────────────── */

export type InfoIconName = 'location' | 'salary' | 'calendar' | 'phone';

const infoIconMap: Record<InfoIconName, (p: IconProps) => ReactNode> = {
  location: LocationIcon,
  salary: SalaryIcon,
  calendar: CalendarIcon,
  phone: PhoneIcon,
};

export function InfoIcon({ name, ...props }: IconProps & { name: InfoIconName }) {
  const Cmp = infoIconMap[name];
  return <Cmp {...props} />;
}
