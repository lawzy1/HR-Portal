import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthContext';
import { formatVND } from '../utils/formatters';

interface MoneyVisibilityContextType {
  isMoneyHidden: boolean;
  toggleMoneyVisibility: () => void;
  formatMoney: (amount: number) => string;
}

const MoneyVisibilityContext = createContext<MoneyVisibilityContextType | undefined>(undefined);
const STORAGE_KEY = 'tl-hr-hide-money';
const MASKED_MONEY = '••••••';

export const MoneyVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const isEmployee = profile?.role === 'employee';
  const [isMoneyHidden, setIsMoneyHidden] = useState(() => {
    if (isEmployee) return true;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isEmployee) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(isMoneyHidden));
    } catch {
      // The in-memory preference still works when browser storage is unavailable.
    }
  }, [isEmployee, isMoneyHidden]);

  useEffect(() => {
    if (isEmployee) return;
    const syncVisibility = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setIsMoneyHidden(event.newValue === 'true');
    };
    window.addEventListener('storage', syncVisibility);
    return () => window.removeEventListener('storage', syncVisibility);
  }, [isEmployee]);

  const toggleMoneyVisibility = useCallback(() => setIsMoneyHidden((hidden) => !hidden), []);
  const formatMoney = useCallback((amount: number) => (isMoneyHidden ? MASKED_MONEY : formatVND(amount)), [isMoneyHidden]);

  return (
    <MoneyVisibilityContext.Provider value={{ isMoneyHidden, toggleMoneyVisibility, formatMoney }}>
      {children}
    </MoneyVisibilityContext.Provider>
  );
};

export const useMoneyVisibility = () => {
  const context = useContext(MoneyVisibilityContext);
  if (!context) throw new Error('useMoneyVisibility must be used within a MoneyVisibilityProvider');
  return context;
};

export const MoneyVisibilityToggle: React.FC<{ className?: string; showLabel?: boolean }> = ({ className = '', showLabel = false }) => {
  const { isMoneyHidden, toggleMoneyVisibility } = useMoneyVisibility();
  const action = isMoneyHidden ? 'Hiện tất cả số tiền' : 'Ẩn tất cả số tiền';

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        toggleMoneyVisibility();
      }}
      aria-label={action}
      title={action}
      className={`inline-flex shrink-0 items-center justify-center rounded-md text-current/45 transition-colors hover:bg-slate-900/8 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${showLabel ? 'h-8 gap-1.5 px-2.5' : 'h-5 w-5'} ${className}`}
    >
      {isMoneyHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      {showLabel && <span className="hidden sm:inline">{isMoneyHidden ? 'Hiện số tiền' : 'Ẩn số tiền'}</span>}
    </button>
  );
};
