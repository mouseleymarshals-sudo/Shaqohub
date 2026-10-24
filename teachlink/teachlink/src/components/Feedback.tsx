import { ReactNode } from 'react';

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-gray-200 border-t-primary-600"
      style={{ width: size, height: size }}
    />
  );
}

export function FullScreenSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-gray-50">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-primary-100" />
        <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-primary-600" />
      </div>
      {message && <p className="text-sm text-gray-500 animate-pulse">{message}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, message }: { icon: ReactNode; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 text-gray-300 ring-1 ring-gray-100">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm text-gray-500 max-w-xs leading-relaxed">{message}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="skeleton h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
          <div className="flex gap-1.5 pt-1">
            <div className="skeleton h-5 w-14 rounded-full" />
            <div className="skeleton h-5 w-14 rounded-full" />
          </div>
          <div className="flex gap-3 pt-1">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="px-5 py-5 animate-fade-in">
      <div className="flex items-start gap-4 mb-5">
        <div className="skeleton h-16 w-16 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-5 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
          <div className="flex gap-2 pt-1">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
      <div className="space-y-2 mb-5">
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}
