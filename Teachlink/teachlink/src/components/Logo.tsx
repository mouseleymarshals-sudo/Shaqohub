import { Link } from 'react-router-dom';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-9 w-[126px]',
    md: 'h-11 w-[154px]',
    lg: 'h-20 w-[280px]',
  };

  return (
    <Link to="/" aria-label="TeachLink home" className="inline-flex items-center">
      <img
        src="/teachlink-logo.png"
        alt="TeachLink"
        className={`${sizes[size]} object-contain object-left`}
      />
    </Link>
  );
}
