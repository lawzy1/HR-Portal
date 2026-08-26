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

export interface LeaveRequestDateRange {
  start_date: string;
  end_date: string;
  half_day_option?: string | null;
  status?: string | null;
}

const parseIsoDateUtc = (date: string) => new Date(`${date}T00:00:00Z`);

const getLeaveDaysBetween = (
  request: LeaveRequestDateRange,
  rangeStart: Date,
  rangeEnd: Date,
  holidaySet: Set<string>,
): number => {
  const start = parseIsoDateUtc(request.start_date);
  const end = parseIsoDateUtc(request.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  const cursor = new Date(Math.max(start.getTime(), rangeStart.getTime()));
  const boundedEnd = new Date(Math.min(end.getTime(), rangeEnd.getTime()));
  let leaveDays = 0;

  while (cursor <= boundedEnd) {
    const iso = cursor.toISOString().slice(0, 10);
    const dayOfWeek = cursor.getUTCDay();
    const dayWeight = dayOfWeek >= 1 && dayOfWeek <= 5 ? 1 : dayOfWeek === 6 ? 0.5 : 0;

    if (!holidaySet.has(iso) && dayWeight > 0) {
      const isSingleDayHalfLeave =
        request.start_date === request.end_date && request.half_day_option && request.half_day_option !== 'Cả ngày';
      leaveDays += isSingleDayHalfLeave ? 0.5 : dayWeight;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return leaveDays;
};

/** Returns the work-day amount represented by a leave request across its full range. */
export function getLeaveDaysForRange(request: LeaveRequestDateRange, holidayDates: string[] = []): number {
  const start = parseIsoDateUtc(request.start_date);
  const end = parseIsoDateUtc(request.end_date);
  return Number(getLeaveDaysBetween(request, start, end, new Set(holidayDates)).toFixed(1));
}

/**
 * Returns the leave days from one request that fall inside a month.
 * Weekdays count as 1.0, Saturday as 0.5, Sunday and company holidays as 0.
 */
export function getLeaveDaysInMonth(
  request: LeaveRequestDateRange,
  month: number,
  year: number,
  holidayDates: string[] = [],
): number {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  return Number(getLeaveDaysBetween(request, firstDay, lastDay, new Set(holidayDates)).toFixed(1));
}

/**
 * Sums approved leave requests for one employee/month without counting
 * pending or rejected requests in the KPI target.
 */
export function getApprovedLeaveDaysInMonth(
  requests: LeaveRequestDateRange[],
  month: number,
  year: number,
  holidayDates: string[] = [],
): number {
  const total = requests
    .filter((request) => !request.status || request.status === 'Đã duyệt')
    .reduce((sum, request) => sum + getLeaveDaysInMonth(request, month, year, holidayDates), 0);
  return Number(total.toFixed(1));
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
