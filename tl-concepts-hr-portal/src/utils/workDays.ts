/**
 * Utility functions for calculating standard work days and monthly KPI quotas.
 * 
 * Rules:
 * - Calculation cycle: 1st to 30th/31st (or 28th/29th in Feb) of each month.
 * - Work schedule: 5.5 days/week
 *   - Monday to Friday: 1.0 work day per day (T2, T3, T4, T5, T6)
 *   - Saturday: 0.5 work day per day (Nửa ngày T7)
 *   - Sunday: 0 work day (Nghỉ CN)
 * - Standard KPI rate: Default 1.5 views / standard working day (Customizable)
 */

export interface MonthWorkDaysInfo {
  month: number;
  year: number;
  totalCalendarDays: number;
  lastDayOfMonth: number;
  fullWeekdaysCount: number; // T2 - T6 (1.0 công)
  saturdaysCount: number;    // T7 (0.5 công)
  sundaysCount: number;      // CN (0 công)
  standardWorkDays: number;  // (fullWeekdaysCount * 1.0) + (saturdaysCount * 0.5)
  kpiRatePerDay: number;     // e.g. 1.5 views / day
  calculatedKpiTarget: number; // standardWorkDays * kpiRatePerDay
}

/**
 * Calculates the exact standard work days in a month based on the 5.5 days/week rule
 * from day 1 to the last day of the month.
 */
export function getMonthWorkDays(month: number, year: number, kpiRatePerDay: number = 1.5): MonthWorkDaysInfo {
  // Days in month: Day 0 of the next month returns the last day of the target month
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  
  let fullWeekdaysCount = 0;
  let saturdaysCount = 0;
  let sundaysCount = 0;

  for (let day = 1; day <= lastDayOfMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      fullWeekdaysCount++;
    } else if (dayOfWeek === 6) {
      saturdaysCount++;
    } else if (dayOfWeek === 0) {
      sundaysCount++;
    }
  }

  // Formula: (Monday-Friday * 1.0) + (Saturday * 0.5)
  const standardWorkDays = Number((fullWeekdaysCount * 1.0 + saturdaysCount * 0.5).toFixed(1));
  const calculatedKpiTarget = Number((standardWorkDays * kpiRatePerDay).toFixed(1));

  return {
    month,
    year,
    totalCalendarDays: lastDayOfMonth,
    lastDayOfMonth,
    fullWeekdaysCount,
    saturdaysCount,
    sundaysCount,
    standardWorkDays,
    kpiRatePerDay,
    calculatedKpiTarget,
  };
}

/**
 * Helper to get a human-readable summary of the monthly working days formula
 */
export function getWorkDaysFormulaText(info: MonthWorkDaysInfo): string {
  return `${info.fullWeekdaysCount} ngày (T2-T6 × 1.0) + ${info.saturdaysCount} ngày (T7 × 0.5) = ${info.standardWorkDays} ngày công`;
}
