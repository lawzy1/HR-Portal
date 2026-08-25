/**
 * Utility functions for calculating standard work days for a given month.
 *
 * Rules:
 * - Calculation cycle: 1st to 30th/31st (or 28th/29th in Feb) of each month.
 * - Work schedule: 5.5 days/week
 *   - Monday to Friday: 1.0 work day per day (T2, T3, T4, T5, T6)
 *   - Saturday: 0.5 work day per day (Nửa ngày T7)
 *   - Sunday: 0 work day (Nghỉ CN)
 * - Company holidays (Tết, national holidays) falling on a weekday/Saturday
 *   are subtracted from the standard work days.
 */

export interface MonthWorkDaysInfo {
  month: number;
  year: number;
  totalCalendarDays: number;
  lastDayOfMonth: number;
  fullWeekdaysCount: number; // T2 - T6 (1.0 công)
  saturdaysCount: number;    // T7 (0.5 công)
  sundaysCount: number;      // CN (0 công)
  holidaysDeducted: number;  // công bị trừ do rơi vào ngày lễ/Tết
  standardWorkDays: number;  // (fullWeekdaysCount * 1.0) + (saturdaysCount * 0.5) - holidaysDeducted
}

/**
 * Calculates the exact standard work days in a month based on the 5.5 days/week
 * rule from day 1 to the last day of the month, minus any company holidays that
 * fall on a weekday or Saturday. Works for any month/year, past or future.
 */
export function getMonthWorkDays(month: number, year: number, holidayDates: string[] = []): MonthWorkDaysInfo {
  // Days in month: Day 0 of the next month returns the last day of the target month
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const holidaySet = new Set(holidayDates);

  let fullWeekdaysCount = 0;
  let saturdaysCount = 0;
  let sundaysCount = 0;
  let holidaysDeducted = 0;

  for (let day = 1; day <= lastDayOfMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      fullWeekdaysCount++;
      if (holidaySet.has(iso)) holidaysDeducted += 1;
    } else if (dayOfWeek === 6) {
      saturdaysCount++;
      if (holidaySet.has(iso)) holidaysDeducted += 0.5;
    } else if (dayOfWeek === 0) {
      sundaysCount++;
    }
  }

  // Formula: (Monday-Friday * 1.0) + (Saturday * 0.5) - ngày lễ/Tết
  const standardWorkDays = Number((fullWeekdaysCount * 1.0 + saturdaysCount * 0.5 - holidaysDeducted).toFixed(1));

  return {
    month,
    year,
    totalCalendarDays: lastDayOfMonth,
    lastDayOfMonth,
    fullWeekdaysCount,
    saturdaysCount,
    sundaysCount,
    holidaysDeducted,
    standardWorkDays,
  };
}

/**
 * Helper to get a human-readable summary of the monthly working days formula
 */
export function getWorkDaysFormulaText(info: MonthWorkDaysInfo): string {
  const holidayPart = info.holidaysDeducted > 0 ? ` - ${info.holidaysDeducted} công (lễ/Tết)` : '';
  return `${info.fullWeekdaysCount} ngày (T2-T6 × 1.0) + ${info.saturdaysCount} ngày (T7 × 0.5)${holidayPart} = ${info.standardWorkDays} ngày công`;
}
