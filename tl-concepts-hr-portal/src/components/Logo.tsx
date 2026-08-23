import React from 'react';
import tlConceptsIcon from '../assets/images/tl-concepts-icon.png';
import { cn } from '../utils/cn';

const SIZE_MAP = {
  sm: 'w-8 h-8 p-1',
  md: 'w-10 h-10 p-1.5',
  lg: 'w-14 h-14 p-2',
} as const;

interface LogoProps {
  /** 'mark' shows only the icon; 'full' pairs it with the "TL CONCEPTS" wordmark. */
  variant?: 'mark' | 'full';
  size?: keyof typeof SIZE_MAP;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ variant = 'mark', size = 'md', className }) => {
  const mark = (
    <div
      className={cn(
        'rounded-xl bg-white ring-1 ring-sage-200 shadow-sm flex items-center justify-center shrink-0',
        SIZE_MAP[size],
        className
      )}
    >
      <img src={tlConceptsIcon} alt="TL Concepts" className="w-full h-full object-contain" />
    </div>
  );

  if (variant === 'mark') return mark;

  return (
    <div className="flex items-center gap-3">
      {mark}
      <span className="font-bold text-slate-900 text-base tracking-tight">TL CONCEPTS</span>
    </div>
  );
};
