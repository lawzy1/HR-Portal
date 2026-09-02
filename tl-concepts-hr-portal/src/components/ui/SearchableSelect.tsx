import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export type SearchableSelectOption = { value: string; label: string };

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '-- Chọn --',
  searchPlaceholder = 'Tìm kiếm...',
  className = '',
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  const currentLabel = options.find((option) => option.value === value)?.label ?? placeholder;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-bold text-slate-800 outline-none transition hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`truncate ${!value ? 'text-slate-400 font-medium' : ''}`}>{currentLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div role="listbox" className="absolute left-0 top-[calc(100%+0.375rem)] z-50 w-full min-w-[220px] rounded-xl border border-slate-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false);
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400">Không tìm thấy kết quả</p>
            )}
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-800 transition hover:bg-slate-100 ${value === option.value ? 'bg-slate-100' : ''}`}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && <Check className="h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
