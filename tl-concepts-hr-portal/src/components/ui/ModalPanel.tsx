import type { ReactNode } from 'react';

const SIZES = {
  sm: 'max-w-lg',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-6xl',
} as const;

export function ModalPanel({
  children,
  size = 'lg',
  padded = true,
  className = '',
}: {
  children: ReactNode;
  size?: keyof typeof SIZES;
  padded?: boolean;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        className={`w-full ${SIZES[size]} rounded-2xl border border-slate-200 bg-white shadow-2xl ${padded ? 'max-h-[90vh] overflow-y-auto p-6 space-y-4' : 'overflow-hidden'} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
