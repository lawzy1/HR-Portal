import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Month + year query filter. The year field is a free number input instead
// of a fixed dropdown list — a fixed "current year ± N" list runs out once
// the system has been in use longer than that window (see AdminKpiOtView /
// KpiRewardsView history). Still emits plain {month: 1-12, year} numbers so
// every existing query (useAllKpiJobItems(month, year), etc.) is unchanged.
export const MonthYearFilter: React.FC<{
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  className?: string;
}> = ({ month, year, onChange, className = '' }) => {
  const shiftMonth = (delta: number) => {
    const base = new Date(year, month - 1 + delta, 1);
    onChange(base.getMonth() + 1, base.getFullYear());
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => shiftMonth(-1)}
        aria-label="Tháng trước"
        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <select
        value={month}
        onChange={(e) => onChange(Number(e.target.value), year)}
        className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>Tháng {m}</option>
        ))}
      </select>
      <input
        type="number"
        inputMode="numeric"
        value={year}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (Number.isFinite(parsed) && parsed > 0) onChange(month, parsed);
        }}
        className="w-16 bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => shiftMonth(1)}
        aria-label="Tháng sau"
        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
