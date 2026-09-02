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
      <Spinner size={32} />
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, message }: { icon: ReactNode; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 max-w-xs">{message}</p>
    </div>
  );
}
