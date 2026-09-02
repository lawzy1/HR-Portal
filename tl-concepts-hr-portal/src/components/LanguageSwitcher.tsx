import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  const languages = [
    { value: 'vi' as const, label: t('language.vi') },
    { value: 'en' as const, label: t('language.en') },
  ];
  const currentLabel = languages.find((language) => language.value === locale)?.label ?? languages[0].label;

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={t('language.label')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
        className="inline-flex min-w-[104px] items-center justify-between gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
      >
        <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-slate-900" aria-hidden="true" />{currentLabel}</span>
        <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div role="listbox" aria-label={t('language.label')} className="absolute right-0 top-[calc(100%+0.375rem)] z-50 min-w-full rounded-lg border border-slate-200 bg-white p-1 shadow-[0_12px_24px_rgba(15,23,42,0.16)]">
          {languages.map((language) => (
            <button
              key={language.value}
              type="button"
              role="option"
              aria-selected={locale === language.value}
              onClick={() => {
                setLocale(language.value);
                setOpen(false);
              }}
              className={`block w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 transition hover:bg-slate-100 ${locale === language.value ? 'bg-slate-100' : ''}`}
            >
              {language.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
